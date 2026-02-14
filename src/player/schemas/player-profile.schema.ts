// src/player/schemas/player-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerProfileDocument = PlayerProfile & Document;

@Schema({ timestamps: true })
export class PlayerProfile {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

    @Prop({ default: false })
    isPro: boolean;

    @Prop({ default: false })
    isVerified: boolean;

    @Prop({ default: 1000 })
    elo: number;

    @Prop({ default: 'Unranked' })
    rank: string;

    @Prop({ default: 0 })
    points: number;

    @Prop({ type: Object, default: {} })
    stats: Record<string, any>;
}

export const PlayerProfileSchema = SchemaFactory.createForClass(PlayerProfile);
