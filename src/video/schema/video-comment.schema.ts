import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoCommentDocument = VideoComment & Document;

@Schema({ timestamps: true })
export class VideoComment {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  video: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true, maxlength: 2000 })
  body: string;

  @Prop({ type: Types.ObjectId, ref: 'VideoComment', default: null })
  parentComment: Types.ObjectId | null;
}

export const VideoCommentSchema = SchemaFactory.createForClass(VideoComment);

VideoCommentSchema.index({ video: 1, createdAt: -1 });
VideoCommentSchema.index({ video: 1, parentComment: 1, createdAt: 1 });
