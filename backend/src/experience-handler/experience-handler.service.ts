import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { userEntity } from 'src/entities/user.entity';
import { achievementEntity } from 'src/entities/achievement.entity';
import { CreateAchievementDto } from 'src/dto/create-achievement.dto';

@Injectable()
export class ExperienceHandlerService {
    constructor(
        @InjectRepository(userEntity)
        private readonly userRepository: Repository<userEntity>,
        @InjectRepository(achievementEntity)
        private readonly achievementRepository: Repository<achievementEntity>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Formuła leveli (progresja kwadratowa):
     * XP potrzebne na level N = N * (N - 1) * 50
     * 
     * Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP...
     */
    calculateLevel(totalXp: number): number {
        // Rozwiązanie równania: totalXp = level * (level - 1) * 50
        // level = floor(0.5 + sqrt(0.25 + totalXp / 50))
        return Math.floor(0.5 + Math.sqrt(0.25 + totalXp / 50));
    }

    getXpRequiredForLevel(level: number): number {
        return level * (level - 1) * 50;
    }

    async createAchievement(userId: string, dto: CreateAchievementDto): Promise<achievementEntity> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('Użytkownik nie został znaleziony');
        }

        const achievement = this.achievementRepository.create({
            userId,
            title: dto.title,
            description: dto.description,
            xpReward: dto.xpReward,
        });

        return this.achievementRepository.save(achievement);
    }

    async completeAchievement(userId: string, achievementId: string) {
        const achievement = await this.achievementRepository.findOne({
            where: { id: achievementId, userId },
        });

        if (!achievement) {
            throw new NotFoundException('Osiągnięcie nie zostało znalezione');
        }

        if (achievement.completed) {
            throw new BadRequestException('To osiągnięcie zostało już ukończone');
        }

        const updatedUser = await this.dataSource.transaction(async (manager) => {
            // Oznacz osiągnięcie jako ukończone
            achievement.completed = true;
            achievement.completedAt = new Date();
            await manager.save(achievement);

            // Atomowy increment XP — bezpieczny przy równoczesnych requestach
            await manager.increment(userEntity, { id: userId }, 'experience', achievement.xpReward);

            // Pobierz usera z aktualnym XP (po uzyciu increment) i przelicz level
            const user = await manager.findOne(userEntity, { where: { id: userId } });
            if (!user) {
                throw new NotFoundException('Użytkownik nie został znaleziony');
            }

            user.level = this.calculateLevel(user.experience);
            await manager.save(user);

            return user;
        });

        const nextLevel = updatedUser.level + 1;
        const xpForNextLevel = this.getXpRequiredForLevel(nextLevel);

        return {
            achievement,
            xpGained: achievement.xpReward,
            totalXp: updatedUser.experience,
            level: updatedUser.level,
            xpToNextLevel: xpForNextLevel - updatedUser.experience,
        };
    }

    async addExperience(userId: string, amount: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Użytkownik nie znaleziony');

        await this.dataSource.transaction(async (manager) => {
            await manager.increment(userEntity, { id: userId }, 'experience', amount);
            const updatedUser = await manager.findOne(userEntity, { where: { id: userId } });
            if (updatedUser) {
                updatedUser.level = this.calculateLevel(updatedUser.experience);
                await manager.save(updatedUser);
            }
        });

        return this.getUserProgress(userId);
    }

    async removeExperience(userId: string, amount: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Użytkownik nie znaleziony');

        await this.dataSource.transaction(async (manager) => {
            const newXp = Math.max(0, user.experience - amount);
            user.experience = newXp;
            user.level = this.calculateLevel(newXp);
            await manager.save(user);
        });

        return this.getUserProgress(userId);
    }

    async getUserProgress(userId: string) {
        // Jedno zapytanie JOIN zamiast dwóch osobnych SELECT-ów
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['achievements'],
            order: { achievements: { createdAt: 'DESC' } },
        });
        if (!user) {
            throw new NotFoundException('Użytkownik nie został znaleziony');
        }

        const nextLevel = user.level + 1;
        const xpForCurrentLevel = this.getXpRequiredForLevel(user.level);
        const xpForNextLevel = this.getXpRequiredForLevel(nextLevel);

        return {
            level: user.level,
            experience: user.experience,
            xpForCurrentLevel,
            xpForNextLevel,
            xpToNextLevel: xpForNextLevel - user.experience,
            progressPercent: xpForNextLevel > xpForCurrentLevel
                ? Math.round(((user.experience - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
                : 100,
            achievements: user.achievements,
        };
    }
}
