import { Test, TestingModule } from '@nestjs/testing';
import { GeminiApiService } from './gemini-api.service';

describe('GeminiApiService', () => {
  let service: GeminiApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiApiService],
    }).compile();

    service = module.get<GeminiApiService>(GeminiApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
