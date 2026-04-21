import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScouterProfileDocument = ScouterProfile & Document;

export enum ScouterLevel {
  REGIONAL = 'REGIONAL', // Can scout within a specific region
  NATIONAL = 'NATIONAL', // Can scout nationwide
  INTERNATIONAL = 'INTERNATIONAL', // Can scout globally
}

@Schema({ timestamps: true })
export class ScouterProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ enum: ScouterLevel, default: ScouterLevel.REGIONAL })
  level: ScouterLevel;

  @Prop({ type: [Types.ObjectId], ref: 'League', default: [] })
  leagues: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Season', default: [] })
  seasons: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'PlayerProfile', default: [] })
  scoutedPlayers: Types.ObjectId[];

  @Prop()
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ScouterProfileSchema =
  SchemaFactory.createForClass(ScouterProfile);
// userId index: already created by @Prop({ unique: true })
ScouterProfileSchema.index({ level: 1 });
ScouterProfileSchema.index({ isActive: 1 });
