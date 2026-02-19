import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SeasonDocument = Season & Document;

export enum SeasonStatus {
    PLANNED = 'PLANNED',
    ONGOING = 'ONGOING',
    FINISHED = 'FINISHED',
}

@Schema({ timestamps: true })
export class Season {
    @Prop({ required: true })
    leagueId: string;

    @Prop({ required: true })
    rulesId: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: true })
    registrationDeadline: Date;

    @Prop({ required: true, enum: SeasonStatus, default: SeasonStatus.PLANNED })
    status: SeasonStatus;

    @Prop()
    description?: string;
}

export const SeasonSchema = SchemaFactory.createForClass(Season);
SeasonSchema.index({ leagueId: 1 });
SeasonSchema.index({ rulesId: 1 });
