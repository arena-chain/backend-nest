import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class Team {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop()
    organizationName?: string;

    @Prop()
    logo?: string;

    @Prop()
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    captain?: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Player' }], default: [] }) // Changed ref from User to Player if needed, but User is common
    members: Types.ObjectId[];

    @Prop({ type: Types.ObjectId, ref: 'TeamManagerProfile' })
    teamManager?: Types.ObjectId;

    @Prop({ type: [{ type: String }], default: [] })
    scouts: string[];

    @Prop({ enum: ['amateur', 'pro'], default: 'amateur' })
    type: string;

    @Prop({ default: false })
    isVerified: boolean;

    // Optional: Rank/Ligue integration
    @Prop({ type: Types.ObjectId, ref: 'Ligue' })
    ligue?: Types.ObjectId;

    @Prop({ default: 0 })
    elo?: number;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
