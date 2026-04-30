import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrainingResultDocument = TrainingResult & Document;

@Schema({ timestamps: true })
export class TrainingResult {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['EASY', 'MEDIUM', 'HARD'] })
  difficulty: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ default: 0 })
  maxCombo: number;

  @Prop({ default: 0 })
  accuracy: number;

  @Prop({ default: 0 })
  totalShots: number;

  @Prop({ default: 0 })
  hits: number;

  @Prop({ default: 0 })
  misses: number;

  @Prop({ default: 0 })
  perfectHits: number;

  @Prop({ default: 0 })
  goodHits: number;

  @Prop({ default: 0 })
  badHits: number;
}

export const TrainingResultSchema =
  SchemaFactory.createForClass(TrainingResult);

TrainingResultSchema.index({ difficulty: 1, score: -1 });
