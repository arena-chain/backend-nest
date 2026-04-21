import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserMissionProgressDocument = UserMissionProgress & Document;

@Schema({ timestamps: true })
export class UserMissionProgress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Mission', required: true })
  missionId: Types.ObjectId;

  @Prop({ default: 0 })
  progress: number;

  @Prop({ default: false })
  completed: boolean;

  @Prop()
  completedAt: Date;

  @Prop({ default: false })
  claimed: boolean;

  @Prop()
  claimedAt: Date;

  @Prop({ required: true })
  cycleKey: string;
}

export const UserMissionProgressSchema =
  SchemaFactory.createForClass(UserMissionProgress);

UserMissionProgressSchema.index(
  { userId: 1, missionId: 1, cycleKey: 1 },
  { unique: true },
);
