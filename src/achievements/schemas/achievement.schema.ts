import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AchievementDocument = Achievement & Document;

@Schema({ timestamps: true })
export class Achievement {
    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    icon: string; // URL to medal image

    @Prop({ required: true })
    missionsRequired: number; // Number of missions to unlock
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);
