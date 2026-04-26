import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HighlightDocument = Highlight & Document;

@Schema({ timestamps: true })
export class Highlight {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
    video: Types.ObjectId;

    @Prop({ required: true })
    startTime: number; // in seconds

    @Prop({ required: true })
    endTime: number; // in seconds

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    creator: Types.ObjectId;
}

export const HighlightSchema = SchemaFactory.createForClass(Highlight);
