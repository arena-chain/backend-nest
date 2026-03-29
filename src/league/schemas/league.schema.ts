import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    organiserId?: Types.ObjectId;
}

export const LeagueSchema = SchemaFactory.createForClass(League);

