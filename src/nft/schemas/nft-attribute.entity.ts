import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NftAttributeDocument = NftAttribute & Document;

@Schema({ timestamps: true })
export class NftAttribute {
  @Prop({ type: Types.ObjectId, ref: 'Nft', required: true })
  nftId: Types.ObjectId;

  @Prop({ required: true })
  traitType: string;

  @Prop({ required: true })
  value: string;

  @Prop()
  displayType?: string;

  @Prop({ type: Number })
  numericValue?: number;

  @Prop({ type: Number })
  maxValue?: number;
}

export const NftAttributeSchema = SchemaFactory.createForClass(NftAttribute);
