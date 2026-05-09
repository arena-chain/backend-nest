import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SeasonTeamDocument = SeasonTeam & Document;

export enum SeasonTeamStatus {
  ACTIVE = 'ACTIVE',
  DISQUALIFIED = 'DISQUALIFIED',
  WITHDRAWN = 'WITHDRAWN',
}

@Schema({ timestamps: true })
export class SeasonTeam {
  @Prop({ required: true })
  seasonId: string;

  @Prop({ required: true })
  teamId: string;

  @Prop()
  seed?: number;

  @Prop({
    required: true,
    enum: SeasonTeamStatus,
    default: SeasonTeamStatus.ACTIVE,
  })
  status: SeasonTeamStatus;

  @Prop()
  qualifiedFromSeasonId?: string;

  /** Human-readable qualification source label, e.g. 'DACH: Evolution Qualifier' */
  @Prop()
  qualifiedFromName?: string;

  @Prop()
  qualifiedViaRank?: number;

  /** Final placement rank after the season ends, e.g. 1 = champion */
  @Prop()
  finalRank?: number;
}

export const SeasonTeamSchema = SchemaFactory.createForClass(SeasonTeam);
SeasonTeamSchema.index({ seasonId: 1, teamId: 1 }, { unique: true });
SeasonTeamSchema.index({ seasonId: 1 });
