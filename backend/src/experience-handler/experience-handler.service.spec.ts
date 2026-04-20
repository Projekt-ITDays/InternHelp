import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceHandlerService } from './experience-handler.service';
import { userEntity } from 'src/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { achievementEntity } from 'src/entities/achievement.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('ExperienceHandlerService', () => {
  let service: ExperienceHandlerService;
  let userRepository: Repository<userEntity>;
  let AchievementRepository: Repository<achievementEntity>;
  const mockUserRepository = {
    findOne : jest.fn(),
    save : jest.fn(),
    create : jest.fn(),
  }
  const achievementRepository = {
    findOne : jest.fn(),
    save : jest.fn(),
    create : jest.fn(),
  }
  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [], 
      providers: [ExperienceHandlerService, {
        provide: getRepositoryToken(userEntity),
        useValue: mockUserRepository
      },
      {
        provide: getRepositoryToken(achievementEntity),
        useValue: achievementRepository 
      },
      {
        provide: DataSource,
        useValue: mockDataSource,
       }
      ],
    }).compile();
    
    service = module.get<ExperienceHandlerService>(ExperienceHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("It shoudl calucalte level" , () => {
    expect(service.calculateLevel(0)).toBe(1);
    expect(service.calculateLevel(100)).toBe(2);
    expect(service.calculateLevel(300)).toBe(3);
    expect(service.calculateLevel(600)).toBe(4);
  })
});
