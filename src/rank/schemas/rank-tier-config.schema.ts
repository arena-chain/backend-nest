import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RankTierConfigDocument = RankTierConfig & Document;

export enum TierName {
    IRON = 'IRON',
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    PLATINUM = 'PLATINUM',
    DIAMOND = 'DIAMOND',
    MASTER = 'MASTER',
    GRANDMASTER = 'GRANDMASTER',
    CHALLENGER = 'CHALLENGER',
}

@Schema({ timestamps: true })
export class RankTierConfig {
    @Prop({ type: Types.ObjectId, ref: 'Catalog' })
    game?: Types.ObjectId; // If null, applies to all games

    @Prop({ required: true, enum: TierName })
    tier: TierName;

    @Prop({ required: true, min: 0 })
    minElo: number;

    @Prop({ min: 0 })
    maxElo?: number; // Null for highest tier (Challenger)

    @Prop({ default: '#6B7280' })
    color: string; // Hex color for UI display

    @Prop()
    icon?: string; // URL or path to tier icon

    @Prop({ default: 3, min: 1 })
    divisions: number; // Number of levels within this tier

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: 0 })
    displayOrder: number; // For sorting tiers in UI
}

export const RankTierConfigSchema = SchemaFactory.createForClass(RankTierConfig);

// Unique index for game + tier combination
RankTierConfigSchema.index({ game: 1, tier: 1 }, { unique: true });
// Index for ELO range queries
RankTierConfigSchema.index({ minElo: 1, maxElo: 1 });
