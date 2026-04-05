import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerRankDocument = PlayerRank & Document;

@Schema({ timestamps: true })
export class PlayerRank {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
    game: Types.ObjectId;

    @Prop({ default: 1000, min: 0 })
    elo: number;

    @Prop({ default: 1, min: 1 })
    level: number;

    @Prop({ default: 'GOLD' })
    tier: string;

    @Prop({ default: 1, min: 1, max: 3 })
    division: number;

    @Prop({ default: 1000 })
    peakElo: number;

    @Prop({ default: 'GOLD' })
    peakTier: string;

    @Prop({ default: 1 })
    peakDivision: number;

    @Prop({ default: 0, min: 0 })
    wins: number;

    @Prop({ default: 0, min: 0 })
    losses: number;

    @Prop({ default: 0, min: 0 })
    winRate: number; // Percentage (0-100)

    @Prop({ default: 1 })
    season: number;

    @Prop()
    lastMatchDate?: Date;

    @Prop({ default: 0 })
    totalMatches: number;

    @Prop({ default: 0 })
    currentStreak: number; // Positive for win streak, negative for loss streak

    @Prop({ default: 0 })
    longestWinStreak: number;
}

export const PlayerRankSchema = SchemaFactory.createForClass(PlayerRank);


