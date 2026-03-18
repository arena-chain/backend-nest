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
    /** Every stage belongs to a season */
    @Prop({ required: true })
    seasonId: string;

    /** Human-readable stage name (e.g., "Play-In", "Playoffs") */
    @Prop({ required: true })
    name: string;

    /** Type of stage: League, Bracket, Swiss, Groups */
    @Prop({ required: true, enum: StageType, default: StageType.LEAGUE })
    stageType: StageType;

    /** Order index to control sequence of stages in a season */
    @Prop({ required: true, default: 0 })
    orderIndex: number;

    /** Start and end dates for this stage */
    @Prop({ required: true })
    startAt: Date;

    @Prop({ required: true })
    endAt: Date;

    /** Lifecycle status of the stage */
    @Prop({ required: true, enum: StageStatus, default: StageStatus.DRAFT })
    status: StageStatus;

    /** Ruleset applied to this stage */
    @Prop({ required: true, type: Types.ObjectId, ref: 'SeasonRule' })
    rulesetId: Types.ObjectId;

    /** Only for bracket stages */
    @Prop({ type: Types.ObjectId, ref: 'Bracket' })
    bracketId?: Types.ObjectId;

    /** Only for league/swiss/group stages: optional ref to a standings group or aggregation id */
    @Prop()
    standingsGroupId?: string;

    /** Optional description of the stage */
    @Prop()
    description?: string;
}

/** Indexes */
export const StageSchema = SchemaFactory.createForClass(Stage);
StageSchema.index({ seasonId: 1, orderIndex: 1 });
StageSchema.index({ rulesetId: 1 });