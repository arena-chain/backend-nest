import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GameTokenLedgerDocument = GameTokenLedgerEntry & Document;

/** High-level movement for UI filters (provided vs used). */
export type GameTokenLedgerDirection = 'in' | 'out';

@Schema({ timestamps: true })
export class GameTokenLedgerEntry {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId;

    @Prop({ trim: true })
    walletAddress?: string;

    @Prop({ type: String, enum: ['in', 'out'], required: true })
    direction!: GameTokenLedgerDirection;

    /**
     * mint_test | purchase_simulated | burn_sell | spend_simulated
     * (Extend later for Stripe purchase, shop spend with on-chain tx, etc.)
     */
    @Prop({ required: true, trim: true })
    category!: string;

    @Prop({ required: true })
    amountWei!: string;

    /** Human-readable amount at time of event (e.g. "100.0") */
    @Prop({ required: true })
    amountFormatted!: string;

    @Prop({ required: true })
    decimals!: number;

    @Prop()
    chainId?: number;

    @Prop({ trim: true, lowercase: true })
    txHash?: string;

    @Prop({ required: true, trim: true })
    title!: string;

    @Prop({ type: Object })
    meta?: Record<string, unknown>;
}

export const GameTokenLedgerEntrySchema = SchemaFactory.createForClass(GameTokenLedgerEntry);

GameTokenLedgerEntrySchema.index({ userId: 1, createdAt: -1 });
GameTokenLedgerEntrySchema.index({ txHash: 1 }, { unique: true, sparse: true });
