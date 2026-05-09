import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HighlightCommentLikeDocument = HighlightCommentLike & Document;

@Schema()
export class HighlightCommentLike {
  @Prop({ type: Types.ObjectId, ref: 'HighlightComment', required: true })
  comment: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const HighlightCommentLikeSchema =
  SchemaFactory.createForClass(HighlightCommentLike);

HighlightCommentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });
