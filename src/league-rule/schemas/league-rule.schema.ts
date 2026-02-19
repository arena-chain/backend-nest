import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeagueRuleDocument = LeagueRule & Document;

export enum MatchFormat {
    BO1 = 'BO1',
    BO3 = 'BO3',
    BO5 = 'BO5',
}

export enum FormatType {
    LEAGUE = 'LEAGUE',
    SWISS = 'SWISS',
    KNOCKOUT = 'KNOCKOUT',
}

export enum TiebreakerRule {
    POINTS = 'POINTS',
    GAME_DIFF = 'GAME_DIFF',
    HEAD_TO_HEAD = 'HEAD_TO_HEAD',
}

@Schema({ timestamps: true })
export class LeagueRule {
    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
    gameId: Types.ObjectId;

    @Prop({ required: true, enum: FormatType, default: FormatType.LEAGUE })
    formatType: FormatType;

    @Prop({ required: true, enum: MatchFormat, default: MatchFormat.BO3 })
    matchType: MatchFormat;

    // Points awarded per match result
    @Prop({ required: true, default: 3 })
    pointsWin: number;


    @Prop({ required: true, default: 0 })
    pointsLoss: number;

    @Prop({ required: true, default: 16 })
    maxTeams: number;

    // Forfeit policy
    @Prop({ required: true, default: 3 })
    maxForfeitsBeforeDisqualification: number;

    @Prop({ default: true })
    forfeitCountsAsLoss: boolean;

    // Tiebreaker order
    @Prop({ required: true, enum: TiebreakerRule, default: TiebreakerRule.GAME_DIFF })
    tiebreaker: TiebreakerRule;

    @Prop({ type: Object })
    extraRules?: Record<string, any>;
}

export const LeagueRuleSchema = SchemaFactory.createForClass(LeagueRule);
LeagueRuleSchema.index({ gameId: 1 });
