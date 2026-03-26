import { Injectable } from "@nestjs/common";
import {ChatGoogle} from "@langchain/google";
import { createAgent, tool } from "langchain";
import { z } from "zod";    
import { InjectRepository } from "@nestjs/typeorm";
import { SurveysEntity } from "src/entities/Surveys.entity";
import { Repository } from "typeorm";
@Injectable()
export class AiAgentService {
    constructor(
        @InjectRepository(SurveysEntity) private surveysRepository : Repository<SurveysEntity>
    ) {}


    model = new ChatGoogle('gemini-2.5-flash-lite')
    prompt = ` Jesteś ekspertem w dziedzienie rozwoju kariery . Stwórz szczególowa roadmape nauki i zdobywania wiedy w danym okresie czasu  , plan ma byc scisly i wykonany szczegółowo i dokładnie podzielony na osobne sekcje. 
Każda sekcja ma zawierać konkretne tematy do nauki, które są kluczowe dla rozwoju kariery w . Dla każdego tematu podaj krótki opis, dlaczego jest ważny, oraz przykładowe zasoby do nauki (np. książki, kursy online, artykuły).
Odpowiedź powinna być w formacie JSON, gdzie kluczami będą nazwy sekcji (np. "Podstawy", "Zaawansowane tematy", "Projekty praktyczne"), a wartościami będą obiekty zawierające listę tematów, ich opisy i zasoby. 
Masz dostepna baze odpowiedzi zebrana od uzywkonikow : BAZAMONGODB , korzystaj z niej aby tworzyc jak najbardziej spersonalizowane i dopasowane do potrzeb uzytkownika odpowiedzi.
Uzytkownik poda ci swoja edukajce  , swoje doswiadczenie  oraz zainteresowania  , korzystaj z tych informacji aby tworzyc jak najbardziej spersonalizowane i dopasowane do potrzeb uzytkownika odpowiedzi.
ponadto poda ci swoje cele zawodowe  , korzystaj z tych informacji aby tworzyc jak najbardziej spersonalizowane i dopasowane do potrzeb uzytkownika odpowiedzi.
Pamitaj nie mów ogólniakami tylko skup sie na tym o co cie prosi uzytkownik , zeby był to zbity plan , który jest realny i da mu szanse wejsc do branzy w jak najkrótszym czasie.
Masz dostęp do narzędzi które podadza ci szcególowe informacje co do uzytkownika
- jego edukacja get_education()
- jego doswiadczenie get_expreience()
- jego zainteresowania get_intrest()
- jego cele zawodowe get_goal()
- dane z internetu get_web_data()
Korzystaj z tych informacji aby tworzyc jak najbardziej spersonalizowane i dopasowane do potrzeb uzytkownika odpowiedzi.
    `
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
                userId: z.string().describe("Id użytkownika"),
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
                userId: z.string().describe("Id użytkownika"),
            }),
        }
    );
    getInterestTool = tool(
        async ({userId}) =>{
            const surveyData = await this.surveysRepository.findOne({ where: { userId } });
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
                userId: z.string().describe("Id użytkownika"),
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
                userId: z.string().describe("Id użytkownika"),
            }),
        }
    )
    async getAgentResponse(userId: string, userPrompt: string) {
        
        const agent = createAgent({
            model: this.model,
            tools: this.getTools(),
            systemPrompt: `${this.prompt}\nId użytkownika: ${userId}. Używaj narzędzi, gdy potrzebujesz danych użytkownika.`,
        });
        
        const result = await agent.invoke({
            messages: [{ role: "user", content: userPrompt }],
        });

        return result;
    }

    getTools() {
        return [this.getEducationTool,this.getExperienceTool , this.getInterestTool , this.getGoalTool];
    }


}