import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvitationDocument = Invitation & Document;

export enum InvitationType {
  TOURNAMENT = 'TOURNAMENT',
  LEAGUE_SEASON = 'LEAGUE_SEASON',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  teamId: Types.ObjectId;

  @Prop({ required: true, enum: InvitationType })
  type: InvitationType;

  /** Tournament ID when type is TOURNAMENT */
  @Prop({ type: Types.ObjectId, ref: 'Tournament' })
  tournamentId?: Types.ObjectId;

  /** Season ID when type is LEAGUE_SEASON */
  @Prop({ type: Types.ObjectId, ref: 'Season' })
  seasonId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true, enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Prop()
  message?: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  respondedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  respondedBy?: Types.ObjectId;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ teamId: 1, status: 1 });
InvitationSchema.index({ tournamentId: 1 });
InvitationSchema.index({ seasonId: 1 });
InvitationSchema.index({ senderId: 1 });
