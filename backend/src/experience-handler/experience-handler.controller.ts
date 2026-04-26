import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ExperienceHandlerService } from './experience-handler.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateAchievementDto } from 'src/dto/create-achievement.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('experience-handler')
@UseGuards(AuthGuard)
export class ExperienceHandlerController {
    constructor(private readonly experienceHandlerService: ExperienceHandlerService) { }

    @Post('achievements')
    async createAchievement(
        @Req() req: Request & { user: { sub: string } },
        @Body() dto: CreateAchievementDto,
    ) {
        return this.experienceHandlerService.createAchievement(req.user.sub, dto);
    }

    @Patch('achievements/:id/complete')
    async completeAchievement(
        @Req() req: Request & { user: { sub: string } },
        @Param('id', ParseUUIDPipe) achievementId: string,
    ) {
        return this.experienceHandlerService.completeAchievement(req.user.sub, achievementId);
    }

    @Get('progress')
    async getUserProgress(@Req() req: Request & { user: { sub: string } }) {
        return this.experienceHandlerService.getUserProgress(req.user.sub);
    }

    @Post('add')
    async addExperience(
        @Req() req: Request & { user: { sub: string } },
        @Body('amount') amount: number
    ) {
        return this.experienceHandlerService.addExperience(req.user.sub, amount || 0);
    }

    @Post('remove')
    async removeExperience(
        @Req() req: Request & { user: { sub: string } },
        @Body('amount') amount: number
    ) {
        return this.experienceHandlerService.removeExperience(req.user.sub, amount || 0);
    }
}
