import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationCategory {
    MATCHES = 'matches',
    LEAGUES = 'leagues',
    SOCIAL = 'social',
    ACHIEVEMENTS = 'achievements',
    STREAMS = 'streams',
    SECURITY = 'security',
    SYSTEM = 'system',
}

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

    @Prop({ enum: NotificationCategory, default: NotificationCategory.SYSTEM })
    category: NotificationCategory;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    resourceDeleted: boolean;

    @Prop({ default: false })
    archived: boolean;

    @Prop()
    link?: string;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ userId: 1, archived: 1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
