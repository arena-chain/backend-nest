import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerLevelDocument = PlayerLevel & Document;

@Schema({ timestamps: { createdAt: false, updatedAt: 'updatedAt' } })
export class PlayerLevel {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  level: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  currentXP: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalXP: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  updatedAt: Date;
}

export const PlayerLevelSchema = SchemaFactory.createForClass(PlayerLevel);
