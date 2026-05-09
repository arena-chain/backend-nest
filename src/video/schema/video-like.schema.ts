import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoLikeDocument = VideoLike & Document;

@Schema()
export class VideoLike {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  video: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const VideoLikeSchema = SchemaFactory.createForClass(VideoLike);

VideoLikeSchema.index({ video: 1, user: 1 }, { unique: true });
