// src/player/schemas/player-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerProfileDocument = PlayerProfile & Document;

export enum RiotLinkStatus {
  UNLINKED = 'unlinked',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
}

@Schema({ timestamps: true })
export class PlayerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: false })
  isPro: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 1000 })
  elo: number;

  @Prop({ default: 'Unranked' })
  rank: string;

  @Prop({ type: Object, default: {} })
  stats: Record<string, any>;

  // Riot account linking fields
  @Prop({ default: null })
  riotPuuid: string;

  @Prop({ default: null })
  riotGameName: string;

  @Prop({ default: null })
  riotTagLine: string;

  @Prop({ default: null })
  riotRegion: string;

  @Prop({ default: null })
  riotAccountId: string;

  @Prop({ default: null })
  originalIconId: number;

  @Prop({ default: RiotLinkStatus.UNLINKED, enum: RiotLinkStatus })
  riotLinkStatus: RiotLinkStatus;
}

export const PlayerProfileSchema = SchemaFactory.createForClass(PlayerProfile);
