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

    @Prop({ type: Types.ObjectId, ref: 'Channel', required: true })
    channelId: Types.ObjectId;

    @Prop()
    streamUrl?: string;

    @Prop()
    playbackUrl?: string;

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

    @Prop()
    scheduledStartTime?: Date;

    @Prop()
    scheduledEndTime?: Date;
}

export const StreamSchema = SchemaFactory.createForClass(Stream);

// Create indexes
StreamSchema.index({ streamerId: 1 });
StreamSchema.index({ channelId: 1 });
StreamSchema.index({ isLive: 1 });
