import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScoutingReportDocument = ScoutingReport & Document;

@Schema({ timestamps: true })
export class ScoutingReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  scouterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  playerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Match' })
  matchId?: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 100 })
  rating: number;

  @Prop({ default: '' })
  strengths: string;

  @Prop({ default: '' })
  weaknesses: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: '' })
  recommendedRole: string; // Duelist, Support, Controller, etc.
}

export const ScoutingReportSchema =
  SchemaFactory.createForClass(ScoutingReport);
ScoutingReportSchema.index({ scouterId: 1, playerId: 1 });
ScoutingReportSchema.index({ playerId: 1 });
ScoutingReportSchema.index({ matchId: 1 });
