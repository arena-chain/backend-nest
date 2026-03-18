import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BracketDocument = Bracket & Document;

export enum BracketFormat {
    SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
    DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
}

export enum BracketStatus {
    PENDING = 'PENDING',       // Generated, no matches started
    ACTIVE = 'ACTIVE',         // At least one match is ongoing
    COMPLETED = 'COMPLETED',   // Champion determined
}

export enum BracketSlotStatus {
    PENDING = 'PENDING',       // Waiting for teams (from previous round)
    READY = 'READY',           // Both teams assigned, match can be scheduled
    COMPLETED = 'COMPLETED',   // Winner has advanced
    BYE = 'BYE',               // One team advances automatically
}

@Schema({ _id: false })
export class BracketSlot {
    @Prop({ required: true })
    slotId: string;

    @Prop({ required: true })
    roundNumber: number;

    @Prop({ required: true })
    position: number;

    @Prop()
    team1Id?: string;

    @Prop()
    team2Id?: string;

    @Prop()
    winnerId?: string;

    @Prop()
    matchId?: string;

    @Prop()
    nextSlotId?: string;

    @Prop()
    loserNextSlotId?: string;

    @Prop({ required: true, enum: BracketSlotStatus, default: BracketSlotStatus.PENDING })
    status: BracketSlotStatus;
}

@Schema({ timestamps: true })
export class Bracket {
    @Prop({ required: true })
    seasonId: string;

    /** Optional: stage this bracket belongs to */
    @Prop()
    stageId?: string;

    @Prop({ required: true, enum: BracketFormat, default: BracketFormat.SINGLE_ELIMINATION })
    format: BracketFormat;

    @Prop({ required: true })
    totalRounds: number;

    /** All matches in the bracket */
    @Prop({ type: [BracketSlot], default: [] })
    slots: BracketSlot[];

    @Prop({ required: true, enum: BracketStatus, default: BracketStatus.PENDING })
    status: BracketStatus;

    @Prop()
    championId?: string;
}

export const BracketSchema = SchemaFactory.createForClass(Bracket);
BracketSchema.index({ seasonId: 1 });
BracketSchema.index({ stageId: 1 });