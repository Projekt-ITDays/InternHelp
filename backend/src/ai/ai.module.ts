import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysEntity } from 'src/entities/Surveys.entity';
import { AiAgentService } from './aiAgent.service';

@Module({
  imports: [TypeOrmModule.forFeature([SurveysEntity])],
  controllers: [AiController],
  providers: [AiService, AiAgentService],
  exports: [AiAgentService],
})
export class AiModule {}