import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ default: 'info' })
    type: string; // info, warning, success, error

    @Prop({ default: false })
    isRead: boolean;

    @Prop()
    link?: string;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create indexes
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
