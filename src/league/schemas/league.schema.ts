import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeagueDocument = League & Document;

export enum LeagueLevel {
    INTERNATIONAL = 'INTERNATIONAL',
    CONTINENTAL = 'CONTINENTAL',
    NATIONAL = 'NATIONAL',
    REGIONAL = 'REGIONAL',
}

@Schema({ timestamps: true })
export class League {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, enum: LeagueLevel })
    level: LeagueLevel;

    @Prop({ required: true })
    regionId: string;

    @Prop({ required: true })
    gameId: string;

    @Prop()
    description?: string;

    @Prop()
    logoUrl?: string;
}

export const LeagueSchema = SchemaFactory.createForClass(League);
LeagueSchema.index({ gameId: 1 });
LeagueSchema.index({ regionId: 1 });
