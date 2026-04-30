import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PenaltyDocument = Penalty & Document;

export enum PenaltyType {
  TOXIC_BEHAVIOR = 'TOXIC_BEHAVIOR',
  TRASH_TALKING = 'TRASH_TALKING',
  AFK = 'AFK',
  LEAVING_MATCH = 'LEAVING_MATCH',
  GRIEFING = 'GRIEFING',
  INTENTIONAL_FEEDING = 'INTENTIONAL_FEEDING',
  CHEATING = 'CHEATING',
  ACCOUNT_SHARING = 'ACCOUNT_SHARING',
  VERBAL_ABUSE = 'VERBAL_ABUSE',
  HARASSMENT = 'HARASSMENT',
  OTHER = 'OTHER',
}

export enum PenaltySeverity {
  LOW = 'LOW', // Minor infractions: -100 to -200 ELO
  MEDIUM = 'MEDIUM', // Moderate infractions: -200 to -400 ELO
  HIGH = 'HIGH', // Serious infractions: -400 to -600 ELO
  SEVERE = 'SEVERE', // Very serious: -600 to -1000 ELO or rank reset
}

export enum PenaltyStatus {
  ACTIVE = 'ACTIVE',
  APPEALED = 'APPEALED',
  REVERSED = 'REVERSED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class Penalty {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
  game: Types.ObjectId;

  @Prop({ required: true, enum: PenaltyType })
  type: PenaltyType;

  @Prop({ required: true, enum: PenaltySeverity })
  severity: PenaltySeverity;

  @Prop({ required: true, min: 0 })
  eloDeducted: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy: Types.ObjectId; // Admin who issued the penalty

  @Prop({ default: '' })
  notes: string;

  @Prop({ type: [String], default: [] })
  evidence: string[]; // URLs to screenshots, chat logs, etc.

  @Prop({ default: PenaltyStatus.ACTIVE, enum: PenaltyStatus })
  status: PenaltyStatus;

  @Prop({ type: Types.ObjectId, ref: 'Match' })
  match?: Types.ObjectId; // Match where infraction occurred

  @Prop({ type: Types.ObjectId, ref: 'Tournament' })
  tournament?: Types.ObjectId;

  @Prop()
  expiresAt?: Date; // For temporary penalties

  @Prop({ type: Types.ObjectId, ref: 'User' })
  appealedBy?: Types.ObjectId; // User who appealed

  @Prop()
  appealReason?: string;

  @Prop()
  appealDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reversedBy?: Types.ObjectId; // Admin who reversed the penalty

  @Prop()
  reverseReason?: string;

  @Prop()
  reverseDate?: Date;

  @Prop({ default: false })
  includesRankReset: boolean; // For severe penalties like cheating
}

export const PenaltySchema = SchemaFactory.createForClass(Penalty);

// Index for user penalties
PenaltySchema.index({ user: 1, game: 1, createdAt: -1 });
// Index for active penalties
PenaltySchema.index({ status: 1, expiresAt: 1 });
