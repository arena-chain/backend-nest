import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RankHistoryDocument = RankHistory & Document;

export enum EloChangeReason {
    WIN = 'WIN',
    LOSS = 'LOSS',
    PENALTY = 'PENALTY',
    BONUS = 'BONUS',
    SEASON_RESET = 'SEASON_RESET',
    ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

@Schema({ timestamps: true })
export class RankHistory {
    @Prop({ type: Types.ObjectId, ref: 'PlayerRank', required: true })
    playerRank: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
    game: Types.ObjectId;

    @Prop({ required: true })
    previousElo: number;

    @Prop({ required: true })
    newElo: number;

    @Prop({ required: true })
    eloChange: number; // Can be positive or negative

    @Prop({ required: true, enum: EloChangeReason })
    reason: EloChangeReason;

    @Prop()
    reasonDetails?: string; // Additional context

    @Prop({ type: Types.ObjectId, ref: 'Match' })
    match?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Tournament' })
    tournament?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Penalty' })
    penalty?: Types.ObjectId;

    @Prop()
    previousTier?: string;

    @Prop()
    newTier?: string;

    @Prop()
    previousLevel?: number;

    @Prop()
    newLevel?: number;

    @Prop({ default: false })
    isTierPromotion: boolean; // True if player advanced to a new tier

    @Prop({ default: false })
    isTierDemotion: boolean; // True if player dropped to a lower tier
}

export const RankHistorySchema = SchemaFactory.createForClass(RankHistory);

// Index for querying user's rank history
RankHistorySchema.index({ user: 1, game: 1, createdAt: -1 });
// Index for player rank history
RankHistorySchema.index({ playerRank: 1, createdAt: -1 });
