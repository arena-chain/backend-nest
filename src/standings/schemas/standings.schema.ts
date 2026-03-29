import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StandingsDocument = Standings & Document;

@Schema({ timestamps: true })
export class Standings {
    @Prop({ required: true })
    seasonId: string;

    /** Optional stage for stage-specific standings */
    @Prop()
    stageId?: string;

    /** Optional group for group-stage standings (Group A, B, C, D…) */
    @Prop()
    groupId?: string;

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

    // Points (calculated using rules)
    @Prop({ required: true, default: 0 })
    points: number;

    // Score diff for tiebreakers
    @Prop({ default: 0 })
    scoreFor: number;

    @Prop({ default: 0 })
    scoreAgainst: number;

    // Game-level stats (maps won/lost within series)
    @Prop({ default: 0 })
    gamesWon: number;

    @Prop({ default: 0 })
    gamesLost: number;

    @Prop({ default: 0 })
    gameDiff: number;

    // Rank in standings
    @Prop({ required: true, default: 0 })
    rank: number;
}

export const StandingsSchema = SchemaFactory.createForClass(Standings);

// Indexes
StandingsSchema.index({ seasonId: 1, points: -1 });
StandingsSchema.index({ seasonId: 1, stageId: 1, groupId: 1, teamId: 1 }, { unique: true });