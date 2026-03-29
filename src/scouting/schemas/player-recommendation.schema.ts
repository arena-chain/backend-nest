import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerRecommendationDocument = PlayerRecommendation & Document;

export enum RecommendationLevel {
  CONSIDER = 'CONSIDER',
  STRONGLY_RECOMMEND = 'STRONGLY_RECOMMEND',
  MUST_SIGN = 'MUST_SIGN',
}

export enum RecommendationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class PlayerRecommendation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  scouterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  playerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, enum: RecommendationLevel })
  recommendationLevel: RecommendationLevel;

  @Prop({ default: '' })
  message: string;

  @Prop({ required: true, enum: RecommendationStatus, default: RecommendationStatus.PENDING })
  status: RecommendationStatus;
}

export const PlayerRecommendationSchema = SchemaFactory.createForClass(PlayerRecommendation);
PlayerRecommendationSchema.index({ scouterId: 1 });
PlayerRecommendationSchema.index({ playerId: 1 });
PlayerRecommendationSchema.index({ organizationId: 1 });
PlayerRecommendationSchema.index({ status: 1 });
