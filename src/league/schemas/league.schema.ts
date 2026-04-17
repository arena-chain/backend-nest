import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LeagueLevel {
    INTERNATIONAL = 'INTERNATIONAL',
    CONTINENTAL = 'CONTINENTAL',
    NATIONAL = 'NATIONAL',
    REGIONAL = 'REGIONAL',
}

export enum LeagueTier {
    OFFICIAL = 'OFFICIAL',
    COMMUNITY = 'COMMUNITY',
}

export enum LeagueMode {
    SOLO = 'SOLO',
    TEAM = 'TEAM',
}

export enum RegionFilter {
    GLOBAL = 'GLOBAL',
    CONTINENT = 'CONTINENT',
    COUNTRY = 'COUNTRY',
    REGION = 'REGION',
}

export enum LeagueStatus {
    UPCOMING = 'UPCOMING',
    ONGOING = 'ONGOING',
    FINISHED = 'FINISHED',
}

@Schema({ timestamps: true })
export class League extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    gameId: string; // Reference to game catalog

    @Prop({ default: LeagueTier.OFFICIAL })
    tier: LeagueTier;

    @Prop({ default: LeagueMode.SOLO })
    mode: LeagueMode;

    @Prop({ default: RegionFilter.GLOBAL })
    regionFilter: RegionFilter;

    @Prop()
    regionValue: string; // e.g., "Europe", "France", "Paris"

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ default: 100 })
    maxParticipants: number;

    @Prop({ default: 0 })
    minElo: number;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    createdBy: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
    supervisedBy: Types.ObjectId[];

    @Prop({ default: LeagueStatus.UPCOMING })
    status: LeagueStatus;

    @Prop({ type: [{ rank: Number, prize: String, points: Number }] })
    rewards: { rank: number; prize: string; points: number }[];

    @Prop({ default: false })
    rewardsDistributed: boolean;
}

export const LeagueSchema = SchemaFactory.createForClass(League);
