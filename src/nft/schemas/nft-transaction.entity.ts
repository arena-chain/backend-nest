import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NftTransactionDocument = NftTransaction & Document;

@Schema({ timestamps: true })
export class NftTransaction {
  @Prop({ type: Types.ObjectId, ref: 'NftItem', required: true })
  nftItemId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  fromUserId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  toUserId?: Types.ObjectId;

  @Prop({
    enum: ['MINT', 'LIST', 'UNLIST', 'SALE', 'TRANSFER', 'BURN'],
    required: true,
  })
  type: string;

  @Prop({ default: 0 })
  price: number;

  @Prop()
  currency: string;

  @Prop()
  transactionHash?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const NftTransactionSchema =
  SchemaFactory.createForClass(NftTransaction);
