import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
export class Chat {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    senderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    receiverId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Channel' })
    channelId?: Types.ObjectId;

    @Prop({ required: true })
    message: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: 'text' })
    messageType: string; // text, image, file, etc.

    @Prop({ type: [String], default: [] })
    attachments: string[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
