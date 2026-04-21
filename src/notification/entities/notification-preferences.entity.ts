import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferencesDocument = NotificationPreferences &
  Document;

@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // In-app category toggles
  @Prop({ default: true }) matches: boolean;
  @Prop({ default: true }) leagues: boolean;
  @Prop({ default: true }) social: boolean;
  @Prop({ default: true }) achievements: boolean;
  @Prop({ default: true }) streams: boolean;
  // Security is ALWAYS true — cannot be disabled
  @Prop({ default: true }) security: boolean;

  // Email toggles
  @Prop({ default: true }) emailEnabled: boolean;
  @Prop({ default: true }) emailMatches: boolean;
  @Prop({ default: true }) emailLeagues: boolean;
  @Prop({ default: false }) emailSocial: boolean;
  @Prop({ default: true }) emailAchievements: boolean;
  @Prop({ default: false }) emailStreams: boolean;

  // Push token (NOTIF-103)
  @Prop() pushToken?: string;
  @Prop({ enum: ['fcm', 'apns'], default: 'fcm' }) pushPlatform?: string;
  @Prop({ default: true }) pushEnabled: boolean;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(
  NotificationPreferences,
);
NotificationPreferencesSchema.index({ userId: 1 });
