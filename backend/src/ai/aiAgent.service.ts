import { Injectable } from "@nestjs/common";
import {ChatGoogle} from "@langchain/google";
import { createAgent, SystemMessage, tool, ToolRuntime } from "langchain";
import { z } from "zod";    
import { InjectRepository } from "@nestjs/typeorm";
import { SurveysEntity } from "src/entities/Surveys.entity";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { AgentResponse } from "src/entities/AgentResposne.schema";
import { Model } from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";


@Injectable()
export class AiAgentService {
    constructor(
        @InjectRepository(SurveysEntity) private surveysRepository : Repository<SurveysEntity>,
        @InjectModel("AgentResponse") private agentResponseModel: Model<AgentResponse>  ,
    ) {}


    model = new ChatGoogle('gemini-2.5-flash-lite')
    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    private embeddingModel = this.genAI.getGenerativeModel({
        model: "models/gemini-embedding-001",
    });


    prompt = new SystemMessage(`Jesteś elitarnym Architektem Kariery i Mentorem Technologicznym. Twoim zadaniem jest tworzenie wysoce spersonalizowanych, realistycznych i bogatych w detale planów rozwoju (roadmap) dla użytkowników, opartych na ich rzeczywistym doświadczeniu i celach.

ZASADY OBOWIĄZKOWE (KRYTYCZNE DLA DZIAŁANIA SYSTEMU):
1) Zawsze najpierw pobieraj userId z kontekstu narzędzia "get_user_id". Nigdy nie zakładaj ani nie zgaduj userId.
2) Następnie użyj pobranego userId do wywołania następujących narzędzi:
   - get_education({ userId })
   - get_experience({ userId })
   - get_intrest({ userId })
   - get_goal({ userId })
    - retrieve({ query })
3) Dopiero po pomyślnym zebraniu wszystkich powyższych danych przygotuj finalną odpowiedź.
4) Nigdy nie wymyślaj userId i nie używaj wartości testowych typu "test_user". Nie halucynuj danych o użytkowniku.

WYTYCZNE DLA TWORZENIA PLANU (Jeśli użytkownik prosi o plan/roadmapę):
- Zwróć wynik WYŁĄCZNIE jako poprawny obiekt JSON, bez żadnego dodatkowego tekstu przed lub po.
- Podziel plan na logiczne etapy czasowe (np. "Miesiące 1-3", "Miesiące 4-6", itd.).
- Unikaj ogólników (zamiast "naucz się baz danych", napisz "opanuj podstawy agregacji w MongoDB").
- Zadania praktyczne muszą spełniać kryteria SMART (Skonkretyzowane, Mierzalne, Osiągalne, Istotne, Określone w czasie) i nadawać się do wpisania w portfolio.
- Wskazuj konkretne typy zasobów (konkretne tytuły książek, nazwy platform, frameworków).

WYMAGANA STRUKTURA JSON DLA PLANU:
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
`)
    getEducationTool = tool(
        async ({ userId }) => {
            const surveyData = await this.surveysRepository.findOne({ where: { userId } });
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
            const surveyData = await this.surveysRepository.findOne({ where: { userId } });
            if (!surveyData) {
                return "Brak danych o doświadczeniu dla tego użytkownika.";
            }
            const experience = surveyData.Expierience;
            
            return `Doświadczenie użytkownika: ${experience}.`;
        },{
            name: "get_experience",
            description: "Zwraca informacje o doświadczeniu użytkownika.",
            schema: z.object({
                userId: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        }
    );
    getInterestTool = tool(
        async ({userId}, config  : ToolRuntime) =>{
            const writer = config.writer;
            const surveyData = await this.surveysRepository.findOne({ where: { userId } });
            if(writer) {
                writer( `Pobieranie danych o zainteresowaniach użytkownika o id ${userId}...`);
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
        async ({userId}) =>{
            const surveyData = await this.surveysRepository.findOne({ where: { userId } });
            if (!surveyData) {
                return "Brak danych o celach zawodowych dla tego użytkownika.";
            }
            const goal = surveyData.PreferredInternshipType;
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
            const getUserID = tool(
            (_, config) => {
                return config.context.userId
            },
            {
                name: "get_user_id",
                description: "Get the user's ID.",
                schema: z.object({}),
            }
        );
            const contextSchema = z.object({
            userId: z.string(),
        }); 

        const agent = createAgent({
            model: this.model,
            tools: [this.retrive,this.getEducationTool, this.getExperienceTool, this.getInterestTool, this.getGoalTool,getUserID],
            systemPrompt: this.prompt,
            contextSchema,
        });
        let agentInputs = { messages: [{ role: "user", content: userPrompt }] };
        const stream = await agent.stream(agentInputs ,
            {
                streamMode : "values",
                context: { userId },
            }
        )
        for await (const chunk of stream) {
            console.log("Otrzymano chunk z agenta:", chunk);
        }
        
        const result = await agent.invoke(
                        {
                                messages: [{ role: "user", content: userPrompt }]
                        },
                        {
                                context: { userId },
                        },
                );
        
        return result;
    }

    getTools() {
        return [this.getEducationTool,this.getExperienceTool , this.getInterestTool , this.getGoalTool];
    }

    private async createEmbedding(query: string): Promise<number[]> {
        const result = await this.embeddingModel.embedContent(query);
        return result.embedding.values;
    }

    private extractText(doc: Record<string, unknown>): string {
        const content = doc.content ?? doc.text ?? doc.chunk ?? doc.pageContent ?? doc.response;
        if (typeof content === "string" && content.trim().length > 0) {
            return content;
        }
        return JSON.stringify(doc);
    }

    private getRagCollectionName(): string {
        return process.env.SCRAPED_DATA_COLLECTION || this.agentResponseModel.collection.name;
    }

    
        private retriveSchema = z.object({
            query : z.string().describe("Zapytanie do bazy wiedzy"),
        })
         retrive = tool(
            async ({query}, _config : ToolRuntime) => {

                const collectionName = this.getRagCollectionName();
                const collection = this.agentResponseModel.db.collection(collectionName);

                const vectorField = process.env.MONGO_VECTOR_FIELD || "embedding";
                const vectorIndexName = process.env.MONGO_VECTOR_INDEX || "vector_index";

                try {
                    const queryVector = await this.createEmbedding(query);

                    const vectorResults = await collection.aggregate([
                        {
                            $vectorSearch: {
                                index: vectorIndexName,
                                path: vectorField,
                                queryVector,
                                numCandidates: 80,
                                limit: 5,
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                source: 1,
                                title: 1,
                                url: 1,
                                content: 1,
                                text: 1,
                                chunk: 1,
                                pageContent: 1,
                                response: 1,
                                score: { $meta: "vectorSearchScore" },
                            },
                        },
                    ]).toArray();

                    if (vectorResults.length > 0) {
                        const serialized = vectorResults
                            .map((doc, idx) => {
                                const source = typeof doc.source === "string" ? doc.source : "unknown";
                                const score = typeof doc.score === "number" ? doc.score.toFixed(4) : "n/a";
                                const text = this.extractText(doc as Record<string, unknown>);
                                return `Fragment ${idx + 1} | source=${source} | score=${score}\n${text}`;
                            })
                            .join("\n\n");

                        return [serialized, vectorResults];
                    }
                } catch {
                    // fallback na regex, np. gdy brak Mongo Atlas Vector Search
                }

                const regexResults = await collection.find({
                    $or: [
                        { content: { $regex: query, $options: "i" } },
                        { text: { $regex: query, $options: "i" } },
                        { chunk: { $regex: query, $options: "i" } },
                        { pageContent: { $regex: query, $options: "i" } },
                        { response: { $regex: query, $options: "i" } },
                    ],
                }).limit(5).toArray();

                if (regexResults.length > 0) {
                    const serialized = regexResults
                        .map((doc, idx) => `Fragment ${idx + 1} | fallback=regex\n${this.extractText(doc as Record<string, unknown>)}`)
                        .join("\n\n");

                    return [serialized, regexResults];
                }

                const latestResults = await collection.find({}).sort({ _id: -1 }).limit(3).toArray();
                if (latestResults.length > 0) {
                    const serialized = latestResults
                        .map((doc, idx) => `Najnowszy fragment ${idx + 1}\n${this.extractText(doc as Record<string, unknown>)}`)
                        .join("\n\n");

                    return [serialized, latestResults];
                }

                return [`Brak danych RAG w kolekcji ${collectionName}.`, []];
            },
             {
            name: "retrieve",
            description: "Pobiera kontekst RAG z MongoDB dla zapytania (globalna baza wiedzy).",
            schema: this.retriveSchema,
            responseFormat: "content_and_artifact",
  }
        )
    
}