import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrizePoolDocument = PrizePool & Document;

export enum PrizeSource {
    PLATFORM = 'PLATFORM',       // ArenaChain funds the prize
    SPONSORED = 'SPONSORED',     // External sponsor funds the prize
    MIXED = 'MIXED',             // Both platform + sponsor contribute
}

export enum PrizeStatus {
    PENDING = 'PENDING',         // Season not started yet
    CONFIRMED = 'CONFIRMED',     // Prize officially announced
    DISTRIBUTED = 'DISTRIBUTED', // Prize paid out after season ends
}

export enum PrizeCurrency {
    USD = 'USD',
    EUR = 'EUR',
    TND = 'TND',
    GBP = 'GBP',
}

@Schema({ _id: false })
export class PrizeDistribution {
    @Prop({ required: true })
    rank: number;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    percentage: number;
}

@Schema({ timestamps: true })
export class PrizePool {
    @Prop({ type: Types.ObjectId, ref: 'Season', required: true })
    seasonId: Types.ObjectId;
    
    @Prop({ type: Types.ObjectId, ref: 'League', required: true })
    leagueId: Types.ObjectId;

    @Prop({ required: true })
    totalAmount: number;

    @Prop({ required: true, enum: PrizeCurrency, default: PrizeCurrency.USD })
    currency: PrizeCurrency;

    @Prop({ required: true, enum: PrizeSource, default: PrizeSource.PLATFORM })
    source: PrizeSource;

    @Prop({ type: Types.ObjectId, ref: 'Partnership' })
    sponsorId?: Types.ObjectId;

    @Prop({
        type: [{ rank: Number, amount: Number, percentage: Number }],
        default: [],
        _id: false,
    })
    distribution: PrizeDistribution[];

    @Prop({ required: true, enum: PrizeStatus, default: PrizeStatus.PENDING })
    status: PrizeStatus;

    @Prop()
    notes?: string;
}

export const PrizePoolSchema = SchemaFactory.createForClass(PrizePool);
PrizePoolSchema.index({ seasonId: 1 }, { unique: true });
PrizePoolSchema.index({ leagueId: 1 });
PrizePoolSchema.index({ sponsorId: 1 });
