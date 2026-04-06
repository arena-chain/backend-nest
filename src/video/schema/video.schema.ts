import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoDocument = Video & Document;

@Schema({ timestamps: true })
export class Video {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    url: string;

    @Prop()
    thumbnailUrl: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    uploader: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Catalog' })
    game: Types.ObjectId;

    @Prop({ default: 0 })
    views: number;

    @Prop()
    duration: number; // in seconds

    /** When public, shown on the uploader's channel pages (VOD library). */
    @Prop({ enum: ['public', 'private'], default: 'private' })
    channelVisibility: 'public' | 'private';
}

export const VideoSchema = SchemaFactory.createForClass(Video);
