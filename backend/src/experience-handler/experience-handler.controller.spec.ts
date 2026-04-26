import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceHandlerController } from './experience-handler.controller';
import { CreateAchievementDto } from 'src/dto/create-achievement.dto';

describe('ExperienceHandlerController', () => {
  let controller: ExperienceHandlerController;
  let request = {
    user: { sub: 'test-user-id' },
  } as unknown as Request & { user: { sub: string } }; 
  let createAchievementDto = {
    name: 'Test Achievement',
    description: 'This is a test achievement',
    xpReward: 100,
  } as unknown as CreateAchievementDto;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperienceHandlerController],
    }).compile();

    controller = module.get<ExperienceHandlerController>(ExperienceHandlerController);


  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createAchievement', () => {
    it('should create an achievement', async () => {
        controller.createAchievement(request , createAchievementDto)
    }
        )

  });
});
