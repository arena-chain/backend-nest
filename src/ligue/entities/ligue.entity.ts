import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LigueDocument = Ligue & Document;

@Schema({ timestamps: true })
export class Ligue {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    organizerId: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], default: [] })
    teams: Types.ObjectId[];

    @Prop({ default: 0 })
    prizePool: number;

    @Prop()
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({ default: 'upcoming' })
    status: string; // upcoming, ongoing, completed

    @Prop({ type: Object, default: {} })
    rules: Record<string, any>;
}

export const LigueSchema = SchemaFactory.createForClass(Ligue);
