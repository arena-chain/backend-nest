import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SeasonRosterDocument = SeasonRoster & Document;

export enum RosterStatus {
    OPEN = 'OPEN',     // Players can still be added/removed
    LOCKED = 'LOCKED', // Frozen after registration deadline — no changes allowed
}

@Schema({ timestamps: true })
export class SeasonRoster {
    @Prop({ required: true })
    seasonId: string;

    @Prop({ required: true })
    teamId: string;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    playerIds: Types.ObjectId[];

    @Prop({ required: true, default: 5 })
    minRosterSize: number;

    @Prop({ required: true, default: 8 })
    maxRosterSize: number;

    @Prop({ required: true, enum: RosterStatus, default: RosterStatus.OPEN })
    status: RosterStatus;

    @Prop()
    lockedAt?: Date;
}

export const SeasonRosterSchema = SchemaFactory.createForClass(SeasonRoster);
SeasonRosterSchema.index({ seasonId: 1, teamId: 1 }, { unique: true });
SeasonRosterSchema.index({ seasonId: 1 });
SeasonRosterSchema.index({ teamId: 1 });
