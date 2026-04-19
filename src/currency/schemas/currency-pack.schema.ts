import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CurrencyPackDocument = CurrencyPack & Document;

/** Admin-defined offer: player buys pack → server mints grantWholeTokens of game currency (when payment/simulation is enabled). */
@Schema({ timestamps: true })
export class CurrencyPack {
    @Prop({ required: true, trim: true })
    title!: string;

    @Prop({ trim: true })
    description?: string;

    /** Whole GTK/VEX tokens granted on successful purchase (mint). */
    @Prop({ required: true, min: 1 })
    grantWholeTokens!: number;

    /** Display price (e.g. Stripe later); cents for EUR/USD-style amounts. */
    @Prop({ required: true, min: 0 })
    priceCents!: number;

    @Prop({ default: 'EUR', trim: true, uppercase: true })
    priceCurrency!: string;

    @Prop({ default: true })
    active!: boolean;

    @Prop({ default: 0 })
    sortOrder!: number;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    createdBy!: Types.ObjectId;
}

export const CurrencyPackSchema = SchemaFactory.createForClass(CurrencyPack);

CurrencyPackSchema.index({ active: 1, sortOrder: 1 });
