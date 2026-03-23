import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateAchievementDto {
    @IsString()
    @IsNotEmpty({ message: 'Tytuł osiągnięcia jest wymagany' })
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(1, { message: 'Nagroda XP musi wynosić co najmniej 1' })
    xpReward: number;
}
