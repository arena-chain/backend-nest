import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GamePartyDocument = GameParty & Document;

@Schema({ timestamps: true })
export class PartyMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['LEADER', 'MEMBER'], default: 'MEMBER' })
  role: 'LEADER' | 'MEMBER';

  @Prop({ type: String, enum: ['INVITED', 'ACCEPTED', 'DECLINED', 'LEFT'], default: 'INVITED' })
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'LEFT';

  @Prop()
  joinedAt?: Date;
}

@Schema({ timestamps: true })
export class GameParty {
  @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
  gameId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  hostUserId: Types.ObjectId;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['LEADER', 'MEMBER'], default: 'MEMBER' },
        status: { type: String, enum: ['INVITED', 'ACCEPTED', 'DECLINED', 'LEFT'], default: 'INVITED' },
        joinedAt: Date,
      },
    ],
    default: [],
  })
  members: PartyMember[];

  @Prop({ type: String, enum: ['CUSTOM_1V1', 'CUSTOM_2V2', 'RANKED_5V5'], required: true })
  mode: 'CUSTOM_1V1' | 'CUSTOM_2V2' | 'RANKED_5V5';

  @Prop({
    type: String,
    enum: ['FORMING', 'READY', 'IN_QUEUE', 'MATCHED', 'IN_GAME', 'DISSOLVED'],
    default: 'FORMING',
  })
  status: 'FORMING' | 'READY' | 'IN_QUEUE' | 'MATCHED' | 'IN_GAME' | 'DISSOLVED';

  @Prop({ required: true })
  maxMembers: number;

  @Prop({ type: Types.ObjectId, ref: 'MatchmakingTicket' })
  matchmakingTicketId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Game' })
  gameId_inProgress?: Types.ObjectId;

  @Prop({ default: () => new Date(Date.now() + 30 * 60 * 1000) })
  expiresAt: Date;

  @Prop({ default: () => new Date() })
  lastActivityAt: Date;

  @Prop()
  disbandedAt?: Date;

  @Prop()
  disbandReason?: string;
}

export const GamePartySchema = SchemaFactory.createForClass(GameParty);

GamePartySchema.index({ hostUserId: 1, status: 1 });
GamePartySchema.index({ gameId: 1, status: 1 });
GamePartySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
GamePartySchema.index({ 'members.userId': 1, status: 1 });
