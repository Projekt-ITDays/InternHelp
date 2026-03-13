import { Module } from '@nestjs/common';
import { GeminiApiController } from './gemini-api.controller';
import { GeminiApiService } from './gemini-api.service';

@Module({
  controllers: [GeminiApiController],
  providers: [GeminiApiService]
})
export class GeminiApiModule {}
