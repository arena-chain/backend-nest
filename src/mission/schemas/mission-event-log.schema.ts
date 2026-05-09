import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MissionEventLogDocument = MissionEventLog & Document;

@Schema({ timestamps: true })
export class MissionEventLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  criteriaType: string;

  @Prop({ required: true })
  dedupeKey: string;
}

export const MissionEventLogSchema =
  SchemaFactory.createForClass(MissionEventLog);
MissionEventLogSchema.index(
  { userId: 1, criteriaType: 1, dedupeKey: 1 },
  { unique: true },
);
