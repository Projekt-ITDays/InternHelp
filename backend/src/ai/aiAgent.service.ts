import { BadRequestException, HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ChatGoogle } from "@langchain/google";
import { createAgent, createMiddleware, SystemMessage, tool, ToolMessage, ToolRuntime } from "langchain";
import { z } from "zod";
import { InjectRepository } from "@nestjs/typeorm";
import { SurveysEntity } from "src/entities/Surveys.entity";
import { Repository } from "typeorm";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { AgentResponse } from "src/entities/AgentResposne.schema";
import { Connection, Model } from "mongoose";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
import { MemorySaver } from "@langchain/langgraph";



@Injectable()
export class AiAgentService  implements OnModuleInit  , OnModuleDestroy{
    constructor(
        @InjectRepository(SurveysEntity) private surveysRepository: Repository<SurveysEntity>,
        @InjectModel("AgentResponse") private agentResponseModel: Model<AgentResponse>,

    ) { 

    }
    private readonly MAX_PROMPT_LENGTH = 2000;
    private readonly RATE_LIMIT_WINDOW_MS = 60_000;
    private readonly MAX_REQUESTS_PER_WINDOW = 5;
    private readonly MAX_IN_FLIGHT_PER_USER = 1;
    private readonly SURVEY_CACHE_TTL_MS = 60_000;

    private readonly requestCounters = new Map<string, number[]>();
    private readonly inFlightByUser = new Map<string, number>();
    private readonly surveyCache = new Map<string, { data: SurveysEntity | null; expiresAt: number }>();

    checkpointer = new MemorySaver();
    private mongoUri = process.env.MONGODB_URI || process.env.MANGO_URL || process.env.MONGO_URI;
    vectorStore : MongoDBAtlasVectorSearch;
    collection : any;
    client = new MongoClient(this.mongoUri!);
    async onModuleInit() {
        await this.client.connect();
        console.log("Połączono z MongoDB Atlas");
        this.collection = this.client.db("carriersign").collection("Advices");
        this.vectorStore  = new MongoDBAtlasVectorSearch(this.embeddingModel , {
        collection: this.collection,
        indexName : "vector_index",
        textKey: "text",
        embeddingKey: "embedding",

        
    })
    }
    async onModuleDestroy() {
        await this.client.close();
        console.log("Rozłączono z MongoDB Atlas");
    }
    dynamicModelSelection = createMiddleware({
        name : "dynamicModelSelection",
        wrapModelCall: (request  , handler ) =>{ 
            const messageCount  = request.messages ? request.messages.length : 0;
            const modelName = messageCount > 5 ? "gemini-2.5-flash" : "gemini-3-flash-preview";
            return handler({
                ...request,
                model : new ChatGoogle(modelName)

            })
        }
    })
    handleToolErros = createMiddleware({
    name : "handleToolErrors",
    wrapToolCall : async (request , handler) => {
        try {
            return await handler(request);
        } catch (error) {
            return new ToolMessage({
                content: `The error "${error.message}" occurred while executing the tool . Please handle this error gracefully in your response.`,
                tool_call_id: request.toolCall.id! || "",

            })
        
        }
    }})
    model = new ChatGoogle('gemini-2.5-flash')
    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    private embeddingModel = new GoogleGenerativeAIEmbeddings(
        {
             model: "models/gemini-embedding-001",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            
        }
    )
    
    
    promptTest = new SystemMessage("Podaj mi dane z bazy danych uzywajac narzedzia retrive , korzystjac jedynie z danych z bazy wiedzy , nie halucynuj danych i nie wymyslaj ich. Podaj mi cos ciekawego z bazy")
testprompt(){
    const agent = createAgent({
        model: this.model,
        tools: [this.retrieve],
        systemPrompt: this.promptTest,
    })
    return agent.invoke(
        {
            messages : [{
                role : "user",
                content : "Coś ciekawego z bazy mi podaj "
            }]
        }
    )
}

prompt = `Jesteś elitarnym Architektem Kariery . Twoim zadaniem jest tworzenie wysoce spersonalizowanych, realistycznych i bogatych w detale planów rozwoju (roadmap) dla użytkowników, opartych na ich rzeczywistym doświadczeniu i celach.

ZASADY OBOWIĄZKOWE (KRYTYCZNE DLA DZIAŁANIA SYSTEMU):
1) Użyj ID użytkownika przekazanego na końcu tego promptu, aby wywołać narzędzie get_profile_snapshot({ userId }) jako pierwsze źródło danych (zawiera pełny profil). Jeśli któraś sekcja profilu jest pusta, dopytaj narzędziami szczegółowymi.
2) Dostępne narzędzia szczegółowe:
- get_education({ userId })
- get_experience({ userId })
- get_intrest({ userId })
- get_goal({ userId })
- retrive({ query: userPrompt }) - to narzędzie pozwoli Ci pobrać dodatkowe informacje z bazy wiedzy na temat kariery i rozwoju zawodowego, które mogą być istotne dla użytkownika.
- get_abilities({ userId })
- get_time_left({userID})
3) Na podstawie danych zwróconych przez powyższe narzędzia, stwórz spersonalizowany plan rozwoju kariery, który będzie realistyczny i dostosowany do unikalnej sytuacji użytkownika. Uwzględnij jego edukację, doświadczenie, zainteresowania, cele zawodowe, umiejętności oraz czas, jaki ma do dyspozycji. Wykorzystaj również informacje z bazy wiedzy, jeśli są dostępne.
4) Dopiero po pomyślnym zebraniu wszystkich powyższych danych przygotuj finalną odpowiedź.
5) Nigdy nie wymyślaj userId i nie używaj wartości testowych typu "test_user". Nie halucynuj danych o użytkowniku.

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

    private async getLatestSurveyData(userId: string): Promise<SurveysEntity | null> {
        const now = Date.now();
        const cached = this.surveyCache.get(userId);
        if (cached && cached.expiresAt > now) {
            return cached.data;
        }

        const surveyData = await this.surveysRepository.findOne({ where: { userId }, order: { createdAt: "DESC" } });
        this.surveyCache.set(userId, { data: surveyData, expiresAt: now + this.SURVEY_CACHE_TTL_MS });
        return surveyData;
    }

    private enforceUsageLimits(userId: string, userPrompt: string): void {
        if (!userPrompt?.trim()) {
            throw new BadRequestException("Prompt nie może być pusty.");
        }

        if (userPrompt.length > this.MAX_PROMPT_LENGTH) {
            throw new BadRequestException(`Prompt jest za długi. Maksymalna długość to ${this.MAX_PROMPT_LENGTH} znaków.`);
        }

        const now = Date.now();
        const windowStart = now - this.RATE_LIMIT_WINDOW_MS;

        const existingCalls = this.requestCounters.get(userId) ?? [];
        const validCalls = existingCalls.filter((timestamp) => timestamp >= windowStart);

        if (validCalls.length >= this.MAX_REQUESTS_PER_WINDOW) {
            throw new HttpException("Za dużo zapytań do agenta. Odczekaj chwilę i spróbuj ponownie.", HttpStatus.TOO_MANY_REQUESTS);
        }

        validCalls.push(now);
        this.requestCounters.set(userId, validCalls);

        const inFlight = this.inFlightByUser.get(userId) ?? 0;
        if (inFlight >= this.MAX_IN_FLIGHT_PER_USER) {
            throw new HttpException("Poprzednie zapytanie jest jeszcze przetwarzane. Poczekaj na zakończenie.", HttpStatus.TOO_MANY_REQUESTS);
        }
        this.inFlightByUser.set(userId, inFlight + 1);
    }

    private releaseInFlight(userId: string): void {
        const inFlight = this.inFlightByUser.get(userId) ?? 0;
        if (inFlight <= 1) {
            this.inFlightByUser.delete(userId);
            return;
        }
        this.inFlightByUser.set(userId, inFlight - 1);
    }

    private isModelUnavailable(error: any): boolean {
        const status = error?.status ?? error?.response?.status ?? error?.code;
        const text = String(error?.message ?? error ?? "").toLowerCase();
        return status === 429 || status === 503 || text.includes("429") || text.includes("503") || text.includes("quota") || text.includes("rate") || text.includes("overload") || text.includes("unavailable");
    }

    getEducationTool = tool(
        async ({ userId }) => {
            const surveyData = await this.getLatestSurveyData(userId);
            if (!surveyData) {
                return "Brak danych edukacyjnych dla tego użytkownika.";
            }
            const major = surveyData.Major;
            const yearOfStudy = surveyData.YearOfStudy;
            
            const University = surveyData.University;
            const GraduationYear = surveyData.GraduationYear;
            return `Edukacja użytkownika: kierunek ${major}, rok studiów ${yearOfStudy}. Studiuje na ${University} i planuje ukończyć studia w ${GraduationYear}.`;
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
            const surveyData = await this.getLatestSurveyData(userId);
            if (!surveyData) {
                return "Brak danych o doświadczeniu dla tego użytkownika.";
            }
            const experience = surveyData.Expierience;
            const sideProjects = surveyData.SideProjectsHobby;
            return `Doświadczenie użytkownika: ${experience}. Side projects i hobby: ${sideProjects}.`;
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
            const surveyData = await this.getLatestSurveyData(userId);
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
    getAbilitiesTool = tool(
        async ({ userId }) => {
            const surveyData = await this.getLatestSurveyData(userId);
            if (!surveyData) {
                return "Brak danych o umiejętnościach dla tego użytkownika.";
            
            }
            const strengths = surveyData.Strengths;
            const weaknesses = surveyData.Weaknesses;
            return `Umiejętności użytkownika: Silne strony: ${strengths} , Słabe strony: ${weaknesses}.`;
        },
        {
            name: "get_abilities",
            description: "Zwraca informacje o umiejętnościach użytkownika.",
            schema: z.object({
                userId: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        }
    )

    getTimeleftTool = tool(
        async ({userID}) => {
            const surveyData = await this.getLatestSurveyData(userID);
            if (!surveyData) {
                return "Brak danych o czasie pozostałym do dyspozycji dla tego użytkownika.";
            }
            const timeLeft = surveyData.TimeLeft;
            return `Czas pozostały do dyspozycji użytkownika: ${timeLeft} miesięcy.`;

        },{
            name: "get_time_left",
            description: "Zwraca informacje o czasie pozostałym do dyspozycji użytkownika.",
            schema: z.object({
                userID: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        }
    )
    getGoalTool = tool(
        async ({ userId }) => {
            const surveyData = await this.getLatestSurveyData(userId);
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

    getProfileSnapshotTool = tool(
        async ({ userId }) => {
            const surveyData = await this.getLatestSurveyData(userId);
            if (!surveyData) {
                return {
                    userId,
                    found: false,
                    message: "Brak ankiety dla tego użytkownika."
                };
            }

            return {
                userId,
                found: true,
                education: {
                    major: surveyData.Major,
                    yearOfStudy: surveyData.YearOfStudy,
                    university: surveyData.University,
                    graduationYear: surveyData.GraduationYear,
                },
                experience: surveyData.Expierience,
                sideProjects: surveyData.SideProjectsHobby,
                interests: surveyData.Inrest,
                strengths: surveyData.Strengths,
                weaknesses: surveyData.Weaknesses,
                goal: surveyData.PreferredInternshipType,
                timeLeftMonths: surveyData.TimeLeft,
            };
        },
        {
            name: "get_profile_snapshot",
            description: "Zwraca pełny profil użytkownika z ankiety jednym odczytem bazy.",
            schema: z.object({
                userId: z.string().uuid().describe("Id użytkownika (UUID)"),
            }),
        },
    );

    async getAgentResponse(userId: string, userPrompt: string) {
        this.enforceUsageLimits(userId, userPrompt);

        const agent = createAgent({
            model: this.model,
            tools: [this.getProfileSnapshotTool, this.getEducationTool, this.getExperienceTool, this.getInterestTool, this.getGoalTool, this.retrieve , this.getAbilitiesTool,this.getTimeleftTool],
            middleware: [this.dynamicModelSelection ,this.handleToolErros],
            systemPrompt: `${this.prompt}\n\n=================\nID AKTUALNEGO UŻYTKOWNIKA TO: ${userId}. Użyj tego ID jako parametru userId wywołując wszystkie cztery narzędzia przed zredagowaniem odpowiedzi.\n=================`,
        });

        try {
            const result = await agent.invoke(
                {
                    messages: [{ role: "user", content: userPrompt }]

                }
            );
            return await this.extractAndSavePlan(userId, result);
        } catch (error: any) {
            console.error("Błąd wywołania modelu AI:", error);
            if (this.isModelUnavailable(error)) {
                throw new ServiceUnavailableException("Model AI jest chwilowo niedostępny lub przeciążony. Spróbuj ponownie za moment.");
            }
            throw new ServiceUnavailableException("Nie udało się wygenerować odpowiedzi AI. Spróbuj ponownie później.");
        } finally {
            this.releaseInFlight(userId);
        }
    }

    getTools() {
        return [this.getEducationTool, this.getExperienceTool, this.getInterestTool, this.getGoalTool, this.retrieve];
    }

    private sanitizeForStorage(value: any, seen = new WeakSet<object>()): any {
        if (value === null || value === undefined) return value;

        const primitiveType = typeof value;
        if (primitiveType === "string" || primitiveType === "number" || primitiveType === "boolean") {
            return value;
        }

        if (value instanceof Date) return value;
        if (Buffer.isBuffer(value)) return value.toString("base64");

        if (Array.isArray(value)) {
            return value.map((item) => this.sanitizeForStorage(item, seen));
        }

        if (primitiveType === "object") {
            const objectValue = value as Record<string, any>;

            if (seen.has(objectValue)) return "[Circular]";
            seen.add(objectValue);

            const bsonType = objectValue?._bsontype;
            if (typeof bsonType === "string") {
                if (typeof objectValue.toHexString === "function") {
                    return objectValue.toHexString();
                }
                if (typeof objectValue.toString === "function") {
                    return objectValue.toString();
                }
                return `[${bsonType}]`;
            }

            if (typeof objectValue.toJSON === "function") {
                try {
                    return this.sanitizeForStorage(objectValue.toJSON(), seen);
                } catch {
                   
                }
            }

            const sanitized: Record<string, any> = {};
            for (const [key, nestedValue] of Object.entries(objectValue)) {
                sanitized[key] = this.sanitizeForStorage(nestedValue, seen);
            }
            return sanitized;
        }

        return String(value);
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
                const sanitizedHistory = this.sanitizeForStorage(response);
                const newSavedPlan = new this.agentResponseModel({
                    userId: userId,
                    status: 'active',
                    planData: planObject,
                    fullHistory: sanitizedHistory
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
    retrieveSchema = z.object({ query: z.string() });
    retrieve = tool (
        async ({query}) => {
            const retrivedocs = await this.vectorStore.similaritySearch(query , 5);
            if (retrivedocs.length === 0) {
                return ["Brak danych w bazie wiedzy związanych z tym zapytaniem.",[]];
            }
            const serialized = retrivedocs
            .map(
                (doc) => `Source: ${doc.metadata?.source ?? "unknown"}, Text: ${doc.pageContent}`
            ).join("\n");
            return [serialized , retrivedocs]

        },
        {
            name: "retrive",
            description: "Retrive informacji z bazy wiedzy na podstawie zapytania użytkownika. Zwraca najbardziej podobne dokumenty z bazy.",
            schema: this.retrieveSchema,
            responseFormat : "content_and_artifact"
        }
    );
}