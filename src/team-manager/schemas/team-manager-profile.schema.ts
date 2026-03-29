// src/team-manager/schemas/team-manager-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamManagerProfileDocument = TeamManagerProfile & Document;

@Schema({ timestamps: true })
export class TeamManagerProfile {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

<<<<<<< HEAD
    @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
    team: Types.ObjectId;
=======
    @Prop({ type: Types.ObjectId, ref: 'Team' })
    team?: Types.ObjectId;
>>>>>>> origin/live_stream

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

<<<<<<< HEAD
=======
    @Prop()
    photo?: string;

>>>>>>> origin/live_stream
    @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
    status: string;

    @Prop({ default: false })
    isVerified: boolean;
<<<<<<< HEAD
    @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], default: [] })
    managedTeams: Types.ObjectId[];
=======
>>>>>>> origin/live_stream
}

export const TeamManagerProfileSchema = SchemaFactory.createForClass(TeamManagerProfile);
