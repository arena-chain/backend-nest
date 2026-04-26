// src/admin/schemas/admin-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminProfileDocument = AdminProfile & Document;

@Schema({ timestamps: true })
export class AdminProfile {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

    @Prop({ default: 1 })
    adminLevel: number;

    @Prop({ type: [String], default: [] })
    permissions: string[];
}

export const AdminProfileSchema = SchemaFactory.createForClass(AdminProfile);
// userId index: already created by @Prop({ unique: true })
