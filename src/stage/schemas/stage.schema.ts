import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StageDocument = Stage & Document;

export enum StageType {
    LEAGUE = 'LEAGUE',
    BRACKET = 'BRACKET',
    SWISS = 'SWISS',
    GROUPS = 'GROUPS',
}

export enum StageStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    LIVE = 'LIVE',
    COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true })
export class Stage {
    @Prop()
    leagueId?: string;

    @Prop({ required: true })
    seasonId: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true, enum: StageType, default: StageType.LEAGUE })
    stageType: StageType;

    @Prop({ required: true, default: 0 })
    orderIndex: number;

    @Prop({ required: true })
    startAt: Date;

    @Prop({ required: true })
    endAt: Date;

    @Prop({ required: true, enum: StageStatus, default: StageStatus.DRAFT })
    status: StageStatus;

    @Prop({ required: true, type: Types.ObjectId, ref: 'LeagueRule' })
    rulesetId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Bracket' })
    bracketId?: Types.ObjectId;

    /** For league/swiss/groups: optional ref to a standings group or aggregation id. */
    @Prop()
    standingsId?: string;

    @Prop()
    description?: string;
}

export const StageSchema = SchemaFactory.createForClass(Stage);
StageSchema.index({ seasonId: 1, orderIndex: 1 });
StageSchema.index({ seasonId: 1 });
StageSchema.index({ leagueId: 1 });
StageSchema.index({ rulesetId: 1 });
