import { Controller, Post, Body } from '@nestjs/common'; 
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask') 
  async askGemini(@Body('prompt') prompt: string) {
    const text = await this.aiService.getGeminiResponse(prompt);
    return { answer: text };
  }
}
