import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class AgentResponse {
    @Prop({required: true})
    userId: string;
    
    @Prop({required: false})
    status: string;

    @Prop({type: Object, required: false})
    planData: any;

    @Prop({type: Object, required: false})
    fullHistory: any;
}
export const AgentResponseSchema = SchemaFactory.createForClass(AgentResponse)