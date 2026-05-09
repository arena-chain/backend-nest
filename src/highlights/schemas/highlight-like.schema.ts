import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HighlightLikeDocument = HighlightLike & Document;

@Schema()
export class HighlightLike {
  @Prop({ type: Types.ObjectId, ref: 'Highlight', required: true })
  highlight: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const HighlightLikeSchema = SchemaFactory.createForClass(HighlightLike);

HighlightLikeSchema.index({ highlight: 1, user: 1 }, { unique: true });
