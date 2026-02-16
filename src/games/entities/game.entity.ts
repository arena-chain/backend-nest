import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Catalog } from '../../catalog/schemas/catalog.entity';

export type GameDocument = Game & Document;

@Schema({ timestamps: true })
export class Game {
    @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
    game_id: Types.ObjectId;

    @Prop({ required: true })
    match_type: string;

    @Prop({
        enum: [
            'SCHEDULED',
            'PENDING_ACCEPTANCE',
            'ACCEPTED',
            'CANCELLED',
            'IN_PROGRESS',
            'WAITING_FOR_RESULT',
            'COMPLETED',
        ],
        default: 'SCHEDULED',
    })
    status: string;

    @Prop({ required: true })
    scheduled_at: Date;

    @Prop({ default: 2 })
    number_of_participant: number;

    @Prop()
    started_at: Date;

    @Prop()
    finished_at: Date;

    @Prop()
    mode?: string;

    @Prop()
    region?: string;

    @Prop({ type: Object })
    roomInfo?: {
        roomId: string;
        map?: string;
    };

    @Prop({
        type: [
            {
                userId: { type: Types.ObjectId, ref: 'User', required: true },
                team: { type: String, enum: ['BLUE', 'RED'], required: true },
                accepted: { type: Boolean, default: null },
            },
        ],
        default: [],
    })
    participants: {
        userId: Types.ObjectId;
        team: 'BLUE' | 'RED';
        accepted: boolean | null;
    }[];
}

export const GameSchema = SchemaFactory.createForClass(Game);
