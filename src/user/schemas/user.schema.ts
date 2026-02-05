// src/user/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ required: true, trim: true })
    nickname: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
