import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerProspectStatusDocument = PlayerProspectStatus & Document;

export enum ProspectLevel {
  UNKNOWN = 'UNKNOWN',
  WATCHLIST = 'WATCHLIST',
  PROSPECT = 'PROSPECT',
  ELITE_PROSPECT = 'ELITE_PROSPECT',
  SIGNED = 'SIGNED',
}

export enum ProspectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Schema({ timestamps: true })
export class PlayerProspectStatus {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  playerId: Types.ObjectId;

  @Prop({ required: true, enum: ProspectLevel, default: ProspectLevel.UNKNOWN })
  prospectLevel: ProspectLevel;

  @Prop({ required: true, enum: ProspectPriority, default: ProspectPriority.LOW })
  priority: ProspectPriority;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const PlayerProspectStatusSchema = SchemaFactory.createForClass(PlayerProspectStatus);
// playerId index: already created by @Prop({ unique: true })
PlayerProspectStatusSchema.index({ prospectLevel: 1 });
PlayerProspectStatusSchema.index({ priority: 1 });
