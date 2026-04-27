import { Controller, Post, Body, Sse, Query, MessageEvent, Req, Get, UseGuards, Param, Patch, HttpException, HttpStatus, Delete } from '@nestjs/common';
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

  @Post('verify-task')
  async verifyOpenTask(@Body() data: { challenge: string; userAnswer: string }) {
    if (!data.challenge || !data.userAnswer) {
      throw new HttpException('Brak wyzwania lub odpowiedzi.', HttpStatus.BAD_REQUEST);
    }
    return this.aiService.verifyOpenTask(data.challenge, data.userAnswer);
  }

  @Get('generate-tasks')
  async generateTasksForTopic(
    @Query('topic') topic: string,
    @Query('difficulty') difficulty: string
  ) {
    if (!topic || !difficulty) {
      throw new HttpException('Brak tematu lub trudności.', HttpStatus.BAD_REQUEST);
    }
    return this.aiService.generateTasksForTopic(topic, difficulty);
  }
  @UseGuards(AuthGuard)
  @Post('survey')
  async submitSurvey(
    @Body() surveyData: SurveyDto,
    @Req() req: Request & { user: { sub: string } }
  ) {
    const userId = req.user.sub;
    const result = await this.aiService.sendSurveyData(userId, surveyData);
    return { 
      message: result.isDuplicate ? 'Duplicate profile detected' : 'Survey data saved', 
      isDuplicate: !!result.isDuplicate, 
      id: result.id 
    };
  }

  @UseGuards(AuthGuard)
  @Get('surveys')
  async getUserSurveys(@Req() req: Request & { user: { sub: string } }) {
    return this.aiService.getUserSurveys(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete('surveys/:id')
  async deleteUserSurvey(
    @Param('id') id: number,
    @Req() req: Request & { user: { sub: string } }
  ) {
    return this.aiService.deleteUserSurvey(id, req.user.sub);
  }
  @UseGuards(AuthGuard)
  @Post('survey-results')
  async streamSurveyResults(
    @Body() data: AgentPayloadDto,
    @Req() req: Request & { user: { sub: string } }
  ) {
    const userId = req.user.sub;
    const userprompt = data.prompt;
    return this.aiAgentService.getAgentResponse(userId, userprompt);
  }

  @UseGuards(AuthGuard)
  @Get('plans')
  async getUserPlans(@Req() req: Request & { user: { sub: string } }) {
    return this.aiAgentService.getUserPlans(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('plans/:id/grid-state')
  async saveGridState(
    @Param('id') planId: string,
    @Body() body: { gridCells: any[]; topicStack: any[]; currentLevel: number; totalScore: number; pointsPerDifficulty: any },
    @Req() req: Request & { user: { sub: string } }
  ) {
    try {
      return await this.aiAgentService.saveGridState(planId, req.user.sub, body);
    } catch (e: any) {
      throw new HttpException(e.message || 'Błąd zapisu stanu grafu.', HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Get('plans/:id/grid-state')
  async getGridState(
    @Param('id') planId: string,
    @Req() req: Request & { user: { sub: string } }
  ) {
    const state = await this.aiAgentService.getGridState(planId, req.user.sub);
    return state;
  }

  @UseGuards(AuthGuard)
  @Delete('plans/:id')
  async deleteUserPlan(
    @Param('id') planId: string,
    @Req() req: Request & { user: { sub: string } }
  ) {
    try {
      return await this.aiAgentService.deleteUserPlan(planId, req.user.sub);
    } catch (e: any) {
      throw new HttpException(e.message || 'Błąd usuwania planu.', HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('plans/:id/title')
  async updatePlanTitle(
    @Param('id') planId: string,
    @Body('title') title: string,
    @Req() req: Request & { user: { sub: string } }
  ) {
    try {
      return await this.aiAgentService.updatePlanTitle(planId, req.user.sub, title);
    } catch (e: any) {
      throw new HttpException(e.message || 'Błąd aktualizacji tytułu.', HttpStatus.BAD_REQUEST);
    }
  }
}
