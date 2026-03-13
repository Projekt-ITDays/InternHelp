import { Test, TestingModule } from '@nestjs/testing';
import { GeminiApiController } from './gemini-api.controller';

describe('GeminiApiController', () => {
  let controller: GeminiApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeminiApiController],
    }).compile();

    controller = module.get<GeminiApiController>(GeminiApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
