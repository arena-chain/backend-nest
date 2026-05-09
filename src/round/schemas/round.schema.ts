import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoundDocument = Round & Document;

export enum RoundStatus {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true })
export class Round {
  @Prop({ required: true })
  seasonId: string;

  @Prop()
  stageId?: string;

  @Prop({ required: true, min: 1 })
  roundNumber: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, enum: RoundStatus, default: RoundStatus.SCHEDULED })
  status: RoundStatus;
}

export const RoundSchema = SchemaFactory.createForClass(Round);
RoundSchema.index({ seasonId: 1, roundNumber: 1 }, { unique: true });
RoundSchema.index({ seasonId: 1 });
