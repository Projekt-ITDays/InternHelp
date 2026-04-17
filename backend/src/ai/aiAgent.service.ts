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
import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"



@Injectable()
export class AiAgentService {
    constructor(
        @InjectRepository(SurveysEntity) private surveysRepository: Repository<SurveysEntity>,
        @InjectModel("AgentResponse") private agentResponseModel: Model<AgentResponse>,
    ) { }


    model = new ChatGoogle('gemini-2.5-flash', {
        apiKey: process.env.GEMINI_API_KEY
    })
    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    private embeddingModel = new GoogleGenerativeAIEmbeddings(
        {
            model: "models/gemini-embedding-001",
            apiKey: process.env.GEMINI_API_KEY,
        }
    )
    client = new MongoClient(process.env.MONGODB_URI!);
    collection = this.client.db("career_planner").collection("knowledge_base"); x
    vectorStore  = new MongoDBAtlasVectorSearch(this.embeddingModel , {
        collection: this.collection,
        indexName : "embeddings"
        
    })
     


prompt = `Jesteś elitarnym Architektem Kariery . Twoim zadaniem jest tworzenie wysoce spersonalizowanych, realistycznych i bogatych w detale planów rozwoju (roadmap) dla użytkowników, opartych na ich rzeczywistym doświadczeniu i celach.

ZASADY OBOWIĄZKOWE (KRYTYCZNE DLA DZIAŁANIA SYSTEMU):
1) Użyj ID użytkownika przekazanego na końcu tego promptu, aby wywołać WSZYSTKIE poniższe narzędzia i zebrać o nim pełne informacje:
- get_education({ userId })
- get_experience({ userId })
- get_intrest({ userId })
- get_goal({ userId })
- get_knowledge_base({ userId, query })
3) Dopiero po pomyślnym zebraniu wszystkich powyższych danych przygotuj finalną odpowiedź.
4) Nigdy nie wymyślaj userId i nie używaj wartości testowych typu "test_user". Nie halucynuj danych o użytkowniku.

WYTYCZNE DLA TWORZENIA PLANU (Jeśli użytkownik prosi o plan/roadmapę):
- Zwróć wynik WYŁĄCZNIE jako poprawny obiekt JSON, bez żadnego dodatkowego tekstu przed lub po.
- Podziel plan na logiczne etapy czasowe (np. "Miesiące 1-3", "Miesiące 4-6", itd.).
- Unikaj ogólników (zamiast "naucz się baz danych", napisz "opanuj podstawy agregacji w MongoDB").
- Zadania praktyczne muszą spełniać kryteria SMART (Skonkretyzowane, Mierzalne, Osiągalne, Istotne, Określone w czasie) i nadawać się do wpisania w portfolio.
- Wskazuj konkretne typy zasobów (konkretne tytuły książek, nazwy platform, frameworków).

sxxWYMAGANA STRUKTURA JSON DLA PLANU:
{
"podsumowanie_profilu": "Krótkie (2-3 zdania) podsumowanie obecnego stanu użytkownika i jego głównego celu.",
"szacowany_czas_tygodniowo": "np. 10-15 godzin",
"plan": [
{
"etap": "Nazwa i ramy czasowe etapu (np. Etap 1: Fundamenty Backendowe, 0-3 miesiące)",
"cel_glowny": "Główny cel tego etapu",
"umiejetnosci": {
"twarde": ["Konkretna technologia 1", "Konkretna technologia 2"],
"miekkie": ["np. komunikacja w zespole rozproszonym", "zarządzanie czasem"]
},
"zasoby_edukacyjne": [
"Precyzyjnie nazwany kurs/książka/dokumentacja 1",
"Precyzyjnie nazwany kurs/książka/dokumentacja 2"
],
"projekt_portfolio": {
"nazwa": "Nazwa praktycznego projektu",
"opis": "Co aplikacja będzie robić i jakie technologie wykorzysta",
"kryteria_akceptacji": ["Funkcjonalność A działa", "Pokrycie testami min. 70%"]
},
"wskazniki_sukcesu_kpi": [
"Zbudowanie i wdrożenie projektu X na Heroku/AWS",
"Rozwiązanie 20 zadań na LeetCode"
]
}
]
}

ZASADY DLA INNYCH PYTAŃ (Jeśli pytanie NIE dotyczy planu, np. "Jak mam na imię?"):
- Odpowiedz naturalnym językiem (nie JSON-em), krótko, zwięźle i wyłącznie na podstawie danych pobranych z narzędzi.
- Jeśli nie masz danych, aby odpowiedzieć na pytanie, przyznaj to wprost.
`

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

    async saveGridState(planId: string, userId: string, gridState: {
        gridCells: any[];
        topicStack: any[];
        currentLevel: number;
    }) {
        const plan = await this.agentResponseModel.findOne({ _id: planId, userId });
        if (!plan) {
            throw new Error(`Plan ${planId} nie istnieje lub nie należy do użytkownika.`);
        }
        plan.gridState = { ...gridState, updatedAt: Date.now() };
        await plan.save();
        return { success: true };
    }

    async getGridState(planId: string, userId: string) {
        const plan = await this.agentResponseModel.findOne({ _id: planId, userId }, { gridState: 1 }).exec();
        if (!plan) return null;
        return plan.gridState ?? null;
    }

    retrieve() {

    }
}