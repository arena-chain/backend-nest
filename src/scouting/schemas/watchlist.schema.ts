import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProspectPriority } from './player-prospect-status.schema';

export type WatchlistDocument = Watchlist & Document;

@Schema({ timestamps: true })
export class Watchlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  scouterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  playerId: Types.ObjectId;

  @Prop({ default: '' })
  notes: string;

  @Prop({ enum: ProspectPriority, default: ProspectPriority.LOW })
  priority: ProspectPriority;
}

export const WatchlistSchema = SchemaFactory.createForClass(Watchlist);
WatchlistSchema.index({ scouterId: 1, playerId: 1 }, { unique: true });
WatchlistSchema.index({ scouterId: 1 });
WatchlistSchema.index({ playerId: 1 });
