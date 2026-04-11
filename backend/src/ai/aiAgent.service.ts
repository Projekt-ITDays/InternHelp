import { Injectable } from "@nestjs/common";
import { ChatGoogle } from "@langchain/google";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool, ToolRuntime } from "langchain";
import { z } from "zod";
import { InjectRepository } from "@nestjs/typeorm";
import { SurveysEntity } from "src/entities/Surveys.entity";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { AgentResponse } from "src/entities/AgentResposne.schema";
import { Model } from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";


@Injectable()
export class AiAgentService {
    constructor(
        @InjectRepository(SurveysEntity) private surveysRepository: Repository<SurveysEntity>,
        @InjectModel("AgentResponse") private agentResponseModel: Model<AgentResponse>,
    ) { }


    model = new ChatGoogle('gemini-2.5-flash')
    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    private embeddingModel = new GoogleGenerativeAIEmbeddings(
        {
            model: "models/gemini-embedding-001",
        }
    )
    private vectorstore = new MemoryVectorStore(this.embeddingModel);


        prompt = `Jesteś Elitarnym Architektem Kariery 360°. Pomagasz tworzyć realistyczne, praktyczne i dopasowane do profilu użytkownika plany rozwoju oraz odpowiadasz rzeczowo na pytania o karierę.

### ZASADY PRACY Z KONTEXTEM
Masz dostęp wyłącznie do tych narzędzi:
- get_education
- get_experience
- get_intrest
- get_goal

Zanim odpowiesz, zawsze pobierz kontekst z wszystkich czterech narzędzi, używając tego samego userId przekazanego w systemowej instrukcji.
Nie wymyślaj danych. Jeśli któreś narzędzie zwróci brak informacji, napisz to wprost i oprzyj odpowiedź tylko na dostępnych danych.
Nie odwołuj się do żadnych innych narzędzi ani do bazy wiedzy, bo nie są dostępne.

Priorytet interpretacji danych jest następujący: get_goal > get_experience > get_education > get_intrest.
Jeśli get_goal wskazuje na consulting, strategy, operations, finance, advisory albo podobny tor kariery, roadmapa ma być konsultingowa i nie wolno zamieniać jej na roadmapę IT/backendową, chyba że użytkownik wyraźnie o to poprosi.
Jeśli w danych pojawiają się interesy IT, programowanie lub narzędzia techniczne, traktuj je jako kompetencje wspierające analizę i automatyzację, a nie jako główny kierunek kariery, jeśli cel zawodowy wskazuje consulting.

Jeśli cel użytkownika dotyczy konsultingu, używaj języka i przykładów właściwych dla tego obszaru: case interview, market sizing, issue tree, hypothesis-driven analysis, financial modeling, Excel, PowerPoint, research rynkowy, komunikacja z interesariuszami i strukturyzowanie problemów.
Nie proponuj jako głównego kierunku: backendu, mikroserwisów, DevOps ani pełnej ścieżki software engineering, chyba że użytkownik tego wyraźnie chce.

### TRYB ODPOWIEDZI
1. Jeśli użytkownik prosi o roadmapę, plan rozwoju albo analizę ścieżki kariery, odpowiedz WYŁĄCZNIE poprawnym JSON-em.
2. Jeśli użytkownik zadaje inne pytanie, odpowiedz naturalnym, profesjonalnym językiem po pobraniu kontekstu z narzędzi.
3. Nie dodawaj markdown, komentarzy ani wyjaśnień poza treścią odpowiedzi.

### WYMAGANIA DLA JSON
Jeśli tworzysz roadmapę, zwróć dokładnie taki kształt:
{
    "analiza_potencjalu": "4-5 zdań o dopasowaniu obecnego profilu do celu, z naciskiem na umiejętności transferowalne i luki kompetencyjne.",
    "intensywnosc_pracy": "Jedno konkretne zalecenie godzinowe tygodniowo.",
    "kamienie_milowe": [
        {
            "etap": "Nazwa etapu z horyzontem czasu",
            "fundamenty_merytoryczne": ["Konkretne standardy, przepisy, teorie lub frameworki"],
            "narzedzia_i_technologie": ["Konkretne narzędzia, oprogramowanie lub technologie"],
            "umiejetnosci_miekkie": ["Konkretny skill miękki"],
            "zasoby_eksperckie": ["Precyzyjne książki, kursy, portale, raporty branżowe"],
            "zadanie_praktyczne_portfolio": {
                "nazwa": "Jedno konkretne zadanie końcowe",
                "opis": "Jasny scenariusz wykonania",
                "kryteria_sukcesu": ["Mierzalny wynik 1", "Mierzalny wynik 2"]
            },
            "kpi_postepu": ["Mierzalny postęp 1", "Mierzalny postęp 2"]
        }
    ]
}

### JAKOŚĆ TREŚCI
- Bądź konkretny i wymagający, ale wspierający.
- Jeśli cel dotyczy konkretnej branży, dobieraj język, narzędzia i kryteria do tej branży.
- Każdy etap ma kończyć się realnym artefaktem: projektem, certyfikatem, audytem, analizą lub wdrożeniem.
- Jeśli brakuje danych, wskaż brak i zaproponuj bezpieczny kierunek działania zamiast zgadywać.`
    getEducationTool = tool(
        async ({ userId }) => {
            const surveyData = await this.surveysRepository.findOne({ where: { userId } ,order : { createdAt : "DESC"}} );
            if (!surveyData) {
                return "Brak danych edukacyjnych dla tego użytkownika.";
            }
            const major = surveyData.Major;
            const yearOfStudy = surveyData.YearOfStudy;

            return `Edukacja użytkownika: kierunek ${major}, rok studiów ${yearOfStudy}.`;
        },
        {
            name: "get_education",
            description: "Zwraca informacje o edukacji użytkownika.",
            schema: z.object({
                userId: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        },
    );
    getExperienceTool = tool(
        async ({ userId }) => {
            const surveyData = await this.surveysRepository.findOne({ where: { userId }  ,order : { createdAt : "DESC"}} );
            if (!surveyData) {
                return "Brak danych o doświadczeniu dla tego użytkownika.";
            }
            const experience = surveyData.Expierience;

            return `Doświadczenie użytkownika: ${experience}.`;
        }, {
        name: "get_experience",
        description: "Zwraca informacje o doświadczeniu użytkownika.",
        schema: z.object({
            userId: z.string().uuid().describe("Id użytkownika (UUID)"),
        }),
    }
    );
    getInterestTool = tool(
        async ({ userId }, config: ToolRuntime) => {
            const writer = config.writer;
            const surveyData = await this.surveysRepository.findOne({ where: { userId } ,order : { createdAt : "DESC"}} );
            if (writer) {
                writer(`Pobieranie danych o zainteresowaniach użytkownika o id ${userId}...`);
            }
            if (!surveyData) {
                return "Brak danych o zainteresowaniach dla tego użytkownika.";
            }
            const interest = surveyData.Inrest;
            const strengths = surveyData.Strengths;
            const weaknesses = surveyData.Weaknesses;
            return `Zainteresowania użytkownika: ${interest} , Jego silne strony: ${strengths} , Jego słabości: ${weaknesses}.`;
        },
        {
            name: "get_intrest",
            description: "Zwraca informacje o zainteresowaniach użytkownika.",
            schema: z.object({
                userId: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        }

    )
    getGoalTool = tool(
        async ({ userId }) => {
            const surveyData = await this.surveysRepository.findOne({ where: { userId } , order : { createdAt : "DESC"}} ,
                
             );
            if (!surveyData) {
                return "Brak danych o celach zawodowych dla tego użytkownika.";
            }
            const goal = surveyData.PreferredInternshipType;
            console.log(`Pobieranie danych o celach zawodowych użytkownika o id ${userId}...` , goal);
            return `Cele zawodowe użytkownika: ${goal}.`;
        },
        {
            name: "get_goal",
            description: "Zwraca informacje o celach zawodowych użytkownika.",
            schema: z.object({
                userId: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        }
    )
    async getAgentResponse(userId: string, userPrompt: string) {
        const agent = createReactAgent({
            llm: this.model,
            tools: [this.getEducationTool, this.getExperienceTool, this.getInterestTool, this.getGoalTool],
            stateModifier: `${this.prompt}\n\n=================\nID AKTUALNEGO UŻYTKOWNIKA TO: ${userId}. Użyj tego ID jako parametru userId wywołując wszystkie cztery narzędzia przed zredagowaniem odpowiedzi.\n=================`,
        });


        const result = await agent.invoke(
            {
                messages: [{ role: "user", content: userPrompt }]
            }
        );
        return await this.extractAndSavePlan(userId, result);
    }

    getTools() {
        return [this.getEducationTool, this.getExperienceTool, this.getInterestTool, this.getGoalTool];
    }

    async extractAndSavePlan(userId: string, response: any) {
        try {
            const messages = response.messages;
            const lastMessage = messages[messages.length - 1];

            let rawContent = "";
            if (typeof lastMessage.content === 'string') {
                rawContent = lastMessage.content;
            } else if (Array.isArray(lastMessage.content)) {
                const textBlock = lastMessage.content.find((c: any) => typeof c === 'string' || c.type === 'text');
                rawContent = typeof textBlock === 'string' ? textBlock : (textBlock?.text || "");
            }

            const firstBrace = rawContent.indexOf('{');
            const lastBrace = rawContent.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1) {
                console.log(`Agent zwrócił odpowiedź tekstową: "${rawContent.substring(0, 100)}..."`);
                return { message: rawContent.trim() };
            }

            const cleanJsonString = rawContent.substring(firstBrace, lastBrace + 1);
            let planObject;
            try {
                planObject = JSON.parse(cleanJsonString);
            } catch (e) {
                console.log(`Agent zwrócił uszkodzony JSON (nie udało się sparsować).`);
                return { message: rawContent.trim() };
            }

            const hasRoadmapShape = Array.isArray(planObject.plan) || Array.isArray(planObject.kamienie_milowe);

            if (hasRoadmapShape) {
                const newSavedPlan = new this.agentResponseModel({
                    userId: userId,
                    status: 'active',
                    planData: planObject,
                    fullHistory: response
                });
                await newSavedPlan.save();
                console.log(`Zapisano plan dla użytkownika ${userId}`);
            }

            return planObject;
        } catch (error) {
            console.error("Błąd parsowania lub zapisu planu z AI:", error);
            throw new Error("Nie udało się rozkodować odpowiedzi agenta do bazy.");
        }
    }

    async getUserPlans(userId: string) {
        return await this.agentResponseModel.find({ userId: userId }).sort({ createdAt: -1 }).exec();
    }

    retrieve() {

    }
}