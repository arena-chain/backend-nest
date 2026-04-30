import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CheckInDocument = CheckIn & Document;

export enum CheckInStatus {
  OPEN = 'OPEN', // Window is open, waiting for teams
  BOTH_READY = 'BOTH_READY', // Both teams checked in — match can start
  TEAM1_MISSED = 'TEAM1_MISSED', // Team 1 did not check in before deadline
  TEAM2_MISSED = 'TEAM2_MISSED', // Team 2 did not check in before deadline
  CANCELLED = 'CANCELLED', // Match was cancelled before check-in resolved
}

@Schema({ timestamps: true })
export class CheckIn {
  @Prop({ required: true, unique: true })
  matchId: string;

  @Prop({ required: true })
  seasonId: string;

  @Prop({ required: true })
  deadline: Date;

  @Prop({ default: false })
  team1CheckedIn: boolean;

  @Prop()
  team1CheckedInAt?: Date;

  @Prop({ default: false })
  team2CheckedIn: boolean;

  @Prop()
  team2CheckedInAt?: Date;

  @Prop({ required: true, enum: CheckInStatus, default: CheckInStatus.OPEN })
  status: CheckInStatus;
}

export const CheckInSchema = SchemaFactory.createForClass(CheckIn);
CheckInSchema.index({ seasonId: 1 });
CheckInSchema.index({ deadline: 1 });
