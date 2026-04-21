import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TradingTrade extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TradingAsset', required: true })
  assetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TradingOrder', required: true })
  buyOrderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TradingOrder', required: true })
  sellOrderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  amount: number;
}

export const TradingTradeSchema = SchemaFactory.createForClass(TradingTrade);
