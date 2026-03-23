import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceHandlerController } from './experience-handler.controller';

describe('ExperienceHandlerController', () => {
  let controller: ExperienceHandlerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperienceHandlerController],
    }).compile();

    controller = module.get<ExperienceHandlerController>(ExperienceHandlerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
