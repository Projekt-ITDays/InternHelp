import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { SurveysEntity } from 'src/entities/Surveys.entity';
import { AiAgentService } from './aiAgent.service';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { AgentResponse, AgentResponseSchema } from 'src/entities/AgentResposne.schema';

@Module({
  imports: [
    /*TypeOrmModule.forFeature([SurveysEntity]) , MongooseModule.forFeature([{
    name: AgentResponse.name,
    schema: AgentResponseSchema,
  }])*/
  ],
  controllers: [AiController],
  providers: [
    AiService, 
    AiAgentService,
    { provide: getRepositoryToken(SurveysEntity), useValue: {} },
    { provide: getModelToken(AgentResponse.name), useValue: {} }
  ],
  exports: [AiAgentService],
})
export class AiModule {}