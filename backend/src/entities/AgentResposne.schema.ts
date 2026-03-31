import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema()
export class AgentResponse {
    @Prop({required: true})
    userId: string;
    
    @Prop({required: true})
    response: string;

    @Prop({required: true})
    numberForSpliting: number;
}
export const  AgentResponseSchema = SchemaFactory.createForClass(AgentResponse)