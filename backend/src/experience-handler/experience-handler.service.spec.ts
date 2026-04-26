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
  // mocowanie kazdeej bazy mega wazne podepnij pozniej pod before eacha
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
    userRepository = module.get<Repository<userEntity>>(getRepositoryToken(userEntity));
    AchievementRepository = module.get<Repository<achievementEntity>>(getRepositoryToken(achievementEntity));
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

  it("should return xp required for level" , () => {
    expect(service.getXpRequiredForLevel(1)).toBe(0);
    expect(service.getXpRequiredForLevel(2)).toBe(100);
    expect(service.getXpRequiredForLevel(3)).toBe(300);
    expect(service.getXpRequiredForLevel(4)).toBe(600);
  })
  describe('createAchievement', () => {
    it('should create an achievement', async () => {
        const userId = 'test-user-id';
        const dto = {
            title: 'Test Achievement',
            description : "Buchała",
            xpReward : 100,
        }
        const expectedAchievement = { userId, ...dto };
        
      mockUserRepository.findOne.mockResolvedValue({ id: userId, name: 'Test User' });
      achievementRepository.create.mockReturnValue(expectedAchievement);
      achievementRepository.save.mockResolvedValue(expectedAchievement);

      await service.createAchievement(userId, dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(achievementRepository.create).toHaveBeenCalledWith(expectedAchievement); 
      expect(achievementRepository.save).toHaveBeenCalledWith(expectedAchievement);

    });
  })
});
