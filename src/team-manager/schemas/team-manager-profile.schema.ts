// src/team-manager/schemas/team-manager-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamManagerProfileDocument = TeamManagerProfile & Document;

@Schema({ timestamps: true })
export class TeamManagerProfile {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], default: [] })
    managedTeams: Types.ObjectId[];

    @Prop()
    organizationName?: string;
}

export const TeamManagerProfileSchema = SchemaFactory.createForClass(TeamManagerProfile);
