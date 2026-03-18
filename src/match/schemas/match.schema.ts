import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MatchFormat } from '../../season-rule/schemas/season-rule.schema';

export type MatchDocument = Match & Document;

export enum MatchStatus {
    SCHEDULED = 'SCHEDULED',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    FORFEIT = 'FORFEIT',
    CANCELLED = 'CANCELLED',
}

export class GameResult {
    @Prop({ required: true })
    gameNumber: number;

    @Prop({ required: true })
    winnerId: string;

    @Prop()
    mapName?: string;

    @Prop()
    team1Score?: number;

    @Prop()
    team2Score?: number;

    @Prop()
    durationMinutes?: number;
}

@Schema({ timestamps: true })
export class Match {
    @Prop({ required: true })
    roundId: string;

    @Prop({ required: true })
    seasonId: string;

    @Prop({ required: true })
    team1Id: string;

    @Prop({ required: true })
    team2Id: string;

    // Auto-set from LeagueRule on creation — admin does NOT send this
    @Prop({ required: true, enum: MatchFormat })
    format: MatchFormat;

    @Prop({ required: true })
    scheduledStart: Date;

    @Prop()
    scheduledEnd?: Date;

    /** Order within the round (1, 2, 3…) for display “Match 1”, “Match 2” per week. */
    @Prop()
    matchOrder?: number;

    @Prop()
    refereeId?: string;

    @Prop({ required: true, enum: MatchStatus, default: MatchStatus.SCHEDULED })
    status: MatchStatus;

    // Individual game results within the series
    @Prop({
        type: [{
            gameNumber: Number,
            winnerId: String,
            mapName: String,
            team1Score: Number,
            team2Score: Number,
            durationMinutes: Number,
        }],
        default: [],
    })
    games: GameResult[];

    @Prop({ default: 0 })
    team1GamesWon: number;

    @Prop({ default: 0 })
    team2GamesWon: number;

    // Set when match is COMPLETED or FORFEIT
    @Prop()
    winnerId?: string;

    @Prop()
    loserId?: string;

    // Forfeit info
    @Prop()
    forfeitingTeamId?: string;

    @Prop()
    forfeitReason?: string;

    @Prop()
    notes?: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ roundId: 1 });
MatchSchema.index({ seasonId: 1 });
MatchSchema.index({ team1Id: 1 });
MatchSchema.index({ team2Id: 1 });
