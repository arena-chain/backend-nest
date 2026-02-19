import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StandingsDocument = Standings & Document;

@Schema({ timestamps: true })
export class Standings {
    @Prop({ required: true })
    seasonId: string;

    @Prop({ required: true })
    teamId: string;

    // Match record
    @Prop({ required: true, default: 0 })
    played: number;

    @Prop({ required: true, default: 0 })
    wins: number;

    @Prop({ required: true, default: 0 })
    draws: number;

    @Prop({ required: true, default: 0 })
    losses: number;

    @Prop({ required: true, default: 0 })
    forfeits: number;

    // Points (computed from rules: pointsWin * wins + pointsDraw * draws + ...)
    @Prop({ required: true, default: 0 })
    points: number;

    // Score diff for tiebreaking (maps per-game scores, e.g. rounds won in CS2)
    @Prop({ default: 0 })
    scoreFor: number;

    @Prop({ default: 0 })
    scoreAgainst: number;

    // Game-level stats (maps won/lost within BO3/BO5 series)
    @Prop({ default: 0 })
    gamesWon: number;

    @Prop({ default: 0 })
    gamesLost: number;

    @Prop({ default: 0 })
    gameDiff: number;

    // Rank position in the season table (1st, 2nd, 3rd...)
    @Prop({ required: true, default: 0 })
    rank: number;
}

export const StandingsSchema = SchemaFactory.createForClass(Standings);

StandingsSchema.index({ seasonId: 1, points: -1 });
StandingsSchema.index({ seasonId: 1, teamId: 1 }, { unique: true });
