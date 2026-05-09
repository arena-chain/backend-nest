import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
export class Chat {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  senderId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  receiverId?: Types.ObjectId;

  /** Stream / group channel id — ObjectId or string slug. */
  @Prop({ type: MongooseSchema.Types.Mixed })
  channelId?: Types.ObjectId | string;

  @Prop()
  senderNickname?: string;

  @Prop()
  senderRole?: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: 'text' })
  messageType: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
