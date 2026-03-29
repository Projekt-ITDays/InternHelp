import { Injectable } from "@nestjs/common";
import {ChatGoogle} from "@langchain/google";
import { createAgent, tool, ToolRuntime } from "langchain";
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
    prompt = `Jesteś ekspertem ds. rozwoju kariery i tworzysz spersonalizowane plany dla użytkownika.

ZASADY OBOWIĄZKOWE:
1) Zawsze pobieraj userId z kontekstu narzędzia "get_user_id". Nigdy nie zakładaj ani nie zgaduj userId.
2) Następnie użyj pobranego userId do wywołania:
   - get_education({ userId })
   - get_experience({ userId })
   - get_intrest({ userId })
   - get_goal({ userId })
3) Dopiero po zebraniu danych przygotuj finalną odpowiedź.
4) Nigdy nie wymyślaj userId i nie używaj wartości testowych typu "test_user".

Jeśli użytkownik prosi o plan/roadmapę:
- Zwróć wynik w JSON.
- Podziel plan na sekcje czasowe.
- Dla każdej sekcji podaj: tematy, powód, zasoby, zadania praktyczne.
- Unikaj ogólników, podawaj konkretne kroki.

Jeśli pytanie nie dotyczy planu (np. "What is my name?"):
- Odpowiedz krótko i zgodnie z danymi z narzędzi.
- Nie zgaduj danych, których nie masz.
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
            tools: [this.getEducationTool, this.getExperienceTool, this.getInterestTool, this.getGoalTool,getUserID],
            systemPrompt: this.prompt,
            contextSchema,
        });
        
        
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


}