import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MatchDisputeDocument = MatchDispute & Document;

export enum DisputeStatus {
  PENDING = 'PENDING', // Submitted, awaiting admin review
  UNDER_REVIEW = 'UNDER_REVIEW', // Admin is actively reviewing
  ACCEPTED = 'ACCEPTED', // Dispute upheld — match result overturned
  REJECTED = 'REJECTED', // Dispute denied — original result stands
}

export enum DisputeReason {
  CHEATING = 'CHEATING',
  WRONG_RESULT = 'WRONG_RESULT',
  NO_SHOW = 'NO_SHOW',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  RULE_VIOLATION = 'RULE_VIOLATION',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class MatchDispute {
  @Prop({ required: true })
  matchId: string;

  @Prop({ required: true })
  seasonId: string;

  @Prop({ required: true })
  submittedByTeamId: string;

  @Prop({ required: true, enum: DisputeReason })
  reason: DisputeReason;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  evidenceUrls: string[];

  @Prop({ required: true, enum: DisputeStatus, default: DisputeStatus.PENDING })
  status: DisputeStatus;

  @Prop()
  adminNote?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedByAdminId?: string;
}

export const MatchDisputeSchema = SchemaFactory.createForClass(MatchDispute);
MatchDisputeSchema.index({ matchId: 1 });
MatchDisputeSchema.index({ seasonId: 1 });
MatchDisputeSchema.index({ status: 1 });
MatchDisputeSchema.index({ submittedByTeamId: 1 });
