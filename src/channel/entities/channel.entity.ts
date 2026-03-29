import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChannelDocument = Channel & Document;

@Schema({ timestamps: true })
export class Channel {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    ownerId: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    subscribers: Types.ObjectId[];

    @Prop({ default: 0 })
    subscriberCount: number;

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    bannerUrl?: string;

    @Prop()
    avatarUrl?: string;

    @Prop({ type: [String], default: [] })
    categories: string[];
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
