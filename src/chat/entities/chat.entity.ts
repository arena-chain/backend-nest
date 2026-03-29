import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
export class Chat {
    @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
    senderId?: Types.ObjectId | null;

    @Prop({ required: true, trim: true })
    senderNickname: string;

    @Prop({ required: true, trim: true })
    senderRole: string;

    @Prop({ type: Types.ObjectId, ref: 'Channel', required: true })
    channelId: Types.ObjectId;

    @Prop({ required: true })
    message: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
ChatSchema.index({ channelId: 1, createdAt: -1 });
