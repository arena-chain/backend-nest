import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProcessedXpEventDocument = ProcessedXpEvent & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class ProcessedXpEvent {
  @Prop({ type: String, required: true, unique: true, index: true })
  eventId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: false })
  payloadHash?: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  createdAt: Date;
}

export const ProcessedXpEventSchema =
  SchemaFactory.createForClass(ProcessedXpEvent);
