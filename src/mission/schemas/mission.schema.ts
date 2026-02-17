import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MissionDocument = Mission & Document;

@Schema({ _id: false })
export class MissionCriteria {
    @Prop({ required: true })
    type: string; // e.g., 'play_games', 'win_games', 'earn_xp'

    @Prop({ required: true })
    target: number; // e.g., 10, 5, 1000
}

@Schema({ timestamps: true })
export class Mission {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    reward: number; // e.g., XP points or Coins

    @Prop({ type: MissionCriteria, required: true })
    criteria: MissionCriteria;
}

export const MissionSchema = SchemaFactory.createForClass(Mission);
