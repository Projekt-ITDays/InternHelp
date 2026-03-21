import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceHandlerService } from './experience-handler.service';

describe('ExperienceHandlerService', () => {
  let service: ExperienceHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExperienceHandlerService],
    }).compile();

    service = module.get<ExperienceHandlerService>(ExperienceHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
