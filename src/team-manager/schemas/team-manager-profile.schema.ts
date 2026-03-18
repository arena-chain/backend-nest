// src/team-manager/schemas/team-manager-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamManagerProfileDocument = TeamManagerProfile & Document;

@Schema({ timestamps: true })
export class TeamManagerProfile {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
    team: Types.ObjectId;

    @Prop()
    organizationName?: string;

    @Prop()
    firstName?: string;

    @Prop()
    lastName?: string;

    @Prop()
    cin?: string;

    @Prop()
    age?: number;

    @Prop()
    gender?: string;

    @Prop()
    description?: string;

    @Prop()
    phoneNumber?: string;

    @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
    status: string;

    @Prop({ default: false })
    isVerified: boolean;
}

export const TeamManagerProfileSchema = SchemaFactory.createForClass(TeamManagerProfile);
