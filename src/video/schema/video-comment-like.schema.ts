import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoCommentLikeDocument = VideoCommentLike & Document;

@Schema()
export class VideoCommentLike {
  @Prop({ type: Types.ObjectId, ref: 'VideoComment', required: true })
  comment: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const VideoCommentLikeSchema =
  SchemaFactory.createForClass(VideoCommentLike);

VideoCommentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });
