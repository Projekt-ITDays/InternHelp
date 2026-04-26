import { IsString } from "class-validator";

export class AgentPayloadDto {
    @IsString()
    prompt: string;
}