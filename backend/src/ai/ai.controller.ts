import { Controller, Post, Body, Sse, Query, MessageEvent, Req, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { AiService } from './ai.service';
import { map, Observable } from 'rxjs';
import { SurveyDto } from 'src/dto/survey.dto';
import { AiAgentService } from './aiAgent.service';
import { AgentPayloadDto } from 'src/dto/agentPayload.dto';


@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService, private readonly aiAgentService: AiAgentService) { }

  @Post('ask')
  async askGemini(@Body('prompt') prompt: string) {
    const jsonObject = await this.aiService.getGeminiResponse(prompt);
    return { answer: jsonObject };
  }

  @Sse('roadmap')
  streamRoadmap(@Query('careerPath') careerPath: string): Observable<MessageEvent> {
    return this.aiService.getRoadmapStream(careerPath);
  }

  @Get('roadmap-concepts')
  async getRoadmapConcepts(
    @Query('careerPath') careerPath: string,
    @Query('level') level?: string,
    @Query('exclude') exclude?: string | string[]
  ) {
    const levelNum = level ? parseInt(level, 10) : 1;
    const excludeArray = Array.isArray(exclude) ? exclude : (exclude ? [exclude] : []);
    const concepts = await this.aiService.getRoadmapConcepts(careerPath, levelNum, excludeArray);
    return { concepts };
  }

  @Post('survey')
  async submitSurvey(@Body() surveyData: SurveyDto) {
    console.log('Received survey data:', surveyData);

    this.aiService.sendSurveyData(surveyData);
    return { message: 'Survey data received' };
  }
  @Post('survey-results')
  async streamSurveyResults(@Body() data: AgentPayloadDto) {
    const userId = data.userId;
    const userprompt = data.prompt;
    return this.aiAgentService.getAgentResponse(userId, userprompt);
  }

  @UseGuards(AuthGuard)
  @Get('plans')
  async getUserPlans(@Req() req: Request & { user: { sub: string } }) {
    return this.aiAgentService.getUserPlans(req.user.sub);
  }

  //stary approach
  //@Post('ask') 
  //async askGemini(@Body('prompt') prompt: string) {
  //  const text = await this.aiService.getGeminiResponse(prompt);
  //  return { answer: text };
  //}
}
