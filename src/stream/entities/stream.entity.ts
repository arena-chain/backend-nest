import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StreamDocument = Stream & Document;

@Schema({ timestamps: true })
export class Stream {
    @Prop({ required: true })
    title: string;

    @Prop()
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    streamerId: Types.ObjectId;

<<<<<<< HEAD
    @Prop({ required: true })
    streamUrl: string;
=======
    @Prop({ type: Types.ObjectId, ref: 'Channel', required: true })
    channelId: Types.ObjectId;

    @Prop()
    streamUrl?: string;

    @Prop()
    playbackUrl?: string;
>>>>>>> origin/live_stream

    @Prop({ default: false })
    isLive: boolean;

    @Prop({ default: 0 })
    viewerCount: number;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop()
    thumbnailUrl?: string;

    @Prop()
    startedAt?: Date;

    @Prop()
    endedAt?: Date;
<<<<<<< HEAD
=======

    @Prop()
    scheduledStartTime?: Date;

    @Prop()
    scheduledEndTime?: Date;
>>>>>>> origin/live_stream
}

export const StreamSchema = SchemaFactory.createForClass(Stream);

// Create indexes
StreamSchema.index({ streamerId: 1 });
<<<<<<< HEAD
=======
StreamSchema.index({ channelId: 1 });
>>>>>>> origin/live_stream
StreamSchema.index({ isLive: 1 });
