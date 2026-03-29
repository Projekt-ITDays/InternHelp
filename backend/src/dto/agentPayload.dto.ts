import { IsString } from "class-validator";

export class AgentPayloadDto {
    @IsString()
    userId: string;
    @IsString()
    prompt: string;
}