import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MatchmakingTicketDocument = MatchmakingTicket & Document;

@Schema({ timestamps: true })
export class MatchmakingTicket {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  game: string;

  @Prop({ required: true })
  mode: string;

  @Prop({ required: true })
  server: string;

  @Prop({ required: true, default: 'ALL' })
  region: string;

  @Prop({ required: true })
  elo: number;

  @Prop({ type: Object, default: null })
  riotAccountInfo?: {
    originalIconId: number;
    riotGameName: string;
    riotLinkStatus: string;
    riotPuuid: string;
    riotRegion: string;
    riotTagLine: string;
  } | null;

  @Prop({
    enum: ['SEARCHING', 'SCHEDULED', 'MATCHED', 'CANCELLED'],
    default: 'SEARCHING',
  })
  status: 'SEARCHING' | 'SCHEDULED' | 'MATCHED' | 'CANCELLED';

  @Prop()
  scheduledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Game' })
  gameId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GameParty' })
  partyId?: Types.ObjectId;
}

export const MatchmakingTicketSchema =
  SchemaFactory.createForClass(MatchmakingTicket);
