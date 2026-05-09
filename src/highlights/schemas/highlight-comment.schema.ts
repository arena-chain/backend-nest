import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HighlightCommentDocument = HighlightComment & Document;

@Schema({ timestamps: true })
export class HighlightComment {
  @Prop({ type: Types.ObjectId, ref: 'Highlight', required: true })
  highlight: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true, maxlength: 2000 })
  body: string;

  /** If set, this is a reply to a top-level comment (one level only). */
  @Prop({ type: Types.ObjectId, ref: 'HighlightComment', default: null })
  parentComment: Types.ObjectId | null;
}

export const HighlightCommentSchema =
  SchemaFactory.createForClass(HighlightComment);

HighlightCommentSchema.index({ highlight: 1, createdAt: -1 });
HighlightCommentSchema.index({ highlight: 1, parentComment: 1, createdAt: 1 });
