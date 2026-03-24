import { Controller, Post, Body, Sse, Query, MessageEvent } from '@nestjs/common'; 
import { AiService } from './ai.service';
import { map, Observable } from 'rxjs';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}
  
  @Post('ask') 
  async askGemini(@Body('prompt') prompt: string) {
    const jsonObject = await this.aiService.getGeminiResponse(prompt);
    return { answer: jsonObject };
  }

  @Sse('roadmap')
  streamRoadmap(@Query('careerPath') careerPath: string): Observable<MessageEvent> {
    return this.aiService.getRoadmapStream(careerPath);
  }
  
  //stary approach
  //@Post('ask') 
  //async askGemini(@Body('prompt') prompt: string) {
  //  const text = await this.aiService.getGeminiResponse(prompt);
  //  return { answer: text };
  //}
}
