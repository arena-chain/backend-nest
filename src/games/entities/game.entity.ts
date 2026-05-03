import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Catalog } from '../../catalog/schemas/catalog.entity';

export type GameDocument = Game & Document;

@Schema({ timestamps: true })
export class Game {
  @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
  game_id: Types.ObjectId;

  @Prop({ required: true })
  match_type: string;

  @Prop({
    enum: [
      'SCHEDULED',
      'PENDING_ACCEPTANCE',
      'ACCEPTED',
      'CANCELLED',
      'IN_PROGRESS',
      'WAITING_FOR_RESULT',
      'COMPLETED',
    ],
    default: 'SCHEDULED',
  })
  status: string;

  @Prop({ required: true })
  scheduled_at: Date;

  @Prop({ default: 2 })
  number_of_participant: number;

  @Prop()
  started_at: Date;

  @Prop()
  finished_at: Date;

  @Prop()
  mode?: string;

  @Prop()
  server?: string;

  @Prop()
  region?: string;

  @Prop({ default: 'DEFAULT' })
  map?: string;

  @Prop({ type: Object })
  roomInfo?: {
    roomId: string;
    map?: string;
    steamLobbyId?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  hostUserId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GameParty' })
  partyId?: Types.ObjectId;

  @Prop({ default: false })
  isScheduled: boolean;

  @Prop({ type: String, enum: ['BLUE', 'RED'], default: null })
  winningTeam?: 'BLUE' | 'RED' | null;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        steamId: { type: String, default: null },
        team: { type: String, enum: ['BLUE', 'RED'], required: true },
        accepted: { type: Boolean, default: null },
        elo: { type: Number, default: 1000 },
        riotAccountInfo: {
          type: {
            originalIconId: Number,
            riotGameName: String,
            riotLinkStatus: String,
            riotPuuid: String,
            riotRegion: String,
            riotTagLine: String,
          },
          default: null,
        },
        username: { type: String },
        steamPersonaName: { type: String },
        avatar: { type: String },
      },
    ],
    default: [],
  })
  participants: {
    userId: Types.ObjectId;
    steamId?: string;
    username?: string;
    steamPersonaName?: string;
    avatar?: string;
    team: 'BLUE' | 'RED';
    accepted: boolean | null;
    elo: number;
    riotAccountInfo?: {
      originalIconId: number;
      riotGameName: string;
      riotLinkStatus: string;
      riotPuuid: string;
      riotRegion: string;
      riotTagLine: string;
    } | null;
  }[];

  @Prop({ type: Object, default: {} })
  teams: {
    blue: any[];
    red: any[];
  };
}

export const GameSchema = SchemaFactory.createForClass(Game);
