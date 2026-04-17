import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED';

@Schema({ timestamps: true })
export class TradingOrder extends Document {
    @Prop({ type: Types.ObjectId, ref: 'TradingAsset', required: true })
    assetId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true, enum: ['BUY', 'SELL'] })
    side: OrderSide;

    @Prop({ required: true, enum: ['MARKET', 'LIMIT'] })
    orderType: OrderType;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    amount: number;

    @Prop({ default: 0 })
    filledAmount: number;

    @Prop({ default: 'OPEN', enum: ['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'] })
    status: OrderStatus;
}

export const TradingOrderSchema = SchemaFactory.createForClass(TradingOrder);
