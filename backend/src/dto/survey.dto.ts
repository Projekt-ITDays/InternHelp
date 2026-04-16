import { Transform, Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";



export class SurveyDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @Transform(({ value, obj }) => value ?? obj.userID)
    @IsString()
    userId: string;

    @IsString()
    Major: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    YearOfStudy: number;

    @IsString()
    PreferredInternshipType: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    TimeLeft: number;

    @IsString()
    Inrest: string;

    @IsString()
    Expierience: string;

    @IsString()
    skills: string;

    @IsString()
    AbilitiesLevel: string;

    @IsString()
    SideProjectsHobby: string;

    @IsString()
    Strengths: string;

    @IsString()
    Weaknesses: string;

    @IsString()
    University: string;

    @Type(() => Number)
    @IsInt()
    GraduationYear: number;
    
}