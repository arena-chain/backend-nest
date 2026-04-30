import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerGameProfileDocument = PlayerGameProfile & Document;

@Schema({ timestamps: true })
export class PlayerGameProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
  gameId: Types.ObjectId;

  @Prop({ default: 'UNRANKED' })
  rank: string;

  @Prop({ default: 0 })
  rankDivision: number;

  @Prop({ default: 0 })
  rankPoints: number;

  @Prop({ default: 1000 })
  elo: number;

  @Prop({ default: 1000 })
  peakElo: number;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 1 })
  missionLevel: number;

  @Prop({ default: 0 })
  rankedWins: number;

  @Prop({ default: 0 })
  rankedLosses: number;

  @Prop({ default: 0 })
  customWins: number;

  @Prop({ default: 0 })
  customLosses: number;

  @Prop({ default: 0 })
  gamesPlayed: number;

  @Prop({ default: 'UNLINKED' })
  linkStatus: 'UNLINKED' | 'PENDING' | 'VERIFIED';

  @Prop()
  linkedAccountId?: string;

  @Prop()
  lastPlayedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const PlayerGameProfileSchema =
  SchemaFactory.createForClass(PlayerGameProfile);

PlayerGameProfileSchema.index({ userId: 1, gameId: 1 }, { unique: true });
PlayerGameProfileSchema.index({ userId: 1 });
PlayerGameProfileSchema.index({ gameId: 1, elo: -1 });
PlayerGameProfileSchema.index({ lastPlayedAt: 1 });
