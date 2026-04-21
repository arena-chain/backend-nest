// src/referee/schemas/referee-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefereeProfileDocument = RefereeProfile & Document;

@Schema({ timestamps: true })
export class RefereeProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 'Junior' })
  level: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Match' }], default: [] })
  assignedMatches: Types.ObjectId[];
}

export const RefereeProfileSchema =
  SchemaFactory.createForClass(RefereeProfile);
