import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LeagueParticipant extends Document {
  @Prop({ type: Types.ObjectId, ref: 'League', required: true })
  leagueId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  playerId: Types.ObjectId; // For SOLO mode

  @Prop({ type: String }) // Could be ref to Team collection if implemented
  teamId: string; // For TEAM mode

  @Prop({ default: 0 })
  rankPoints: number;

  @Prop({ default: 0 })
  matchesPlayed: number;

  @Prop({ default: 0 })
  wins: number;

  @Prop({ default: 0 })
  losses: number;

  @Prop({ default: 0 })
  draws: number;

  @Prop({ default: 0 })
  currentStanding: number;
}

export const LeagueParticipantSchema =
  SchemaFactory.createForClass(LeagueParticipant);
// Ensure unique index per league and participant
LeagueParticipantSchema.index(
  { leagueId: 1, playerId: 1 },
  { unique: true, partialFilterExpression: { playerId: { $exists: true } } },
);
LeagueParticipantSchema.index(
  { leagueId: 1, teamId: 1 },
  { unique: true, partialFilterExpression: { teamId: { $exists: true } } },
);
