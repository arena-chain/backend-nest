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

    @Prop({ default: 'SCHEDULED' })
    status: string;

    @Prop({ required: true })
    scheduled_at: Date;

    @Prop({ default: 2 })
    number_of_participant: number;

    @Prop()
    started_at: Date;

    @Prop()
    finished_at: Date;
}

export const GameSchema = SchemaFactory.createForClass(Game);
