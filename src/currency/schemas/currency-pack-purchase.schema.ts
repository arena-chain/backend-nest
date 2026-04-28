import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CurrencyPackPurchaseDocument = CurrencyPackPurchase & Document;

@Schema({ timestamps: true })
export class CurrencyPackPurchase {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CurrencyPack', required: true })
  packId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  packTitleSnapshot!: string;

  @Prop({ required: true, min: 1 })
  wholeTokensGranted!: number;

  @Prop({ required: true, min: 0 })
  priceCentsSnapshot!: number;

  @Prop({ required: true, trim: true, uppercase: true })
  priceCurrencySnapshot!: string;

  @Prop({ trim: true })
  fulfillmentTxHash?: string;

  /** completed | pending (e.g. awaiting real payment webhook) */
  @Prop({ default: 'completed', trim: true })
  status!: string;
}

export const CurrencyPackPurchaseSchema =
  SchemaFactory.createForClass(CurrencyPackPurchase);

CurrencyPackPurchaseSchema.index({ userId: 1, createdAt: -1 });
CurrencyPackPurchaseSchema.index({ packId: 1 });
