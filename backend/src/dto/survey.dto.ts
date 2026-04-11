import { Transform } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";



export class SurveyDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    id?: number;

    @Transform(({ value, obj }) => value ?? obj.userID)
    @IsString()
    userId: string;

    @IsString()
    Major: string;

    @IsInt()
    @Min(1)
    YearOfStudy: number;

    @IsString()
    PreferredInternshipType: string;

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

    @IsInt()
    GraduationYear: number;
    
}