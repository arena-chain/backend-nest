// src/user/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  nickname: string;

  @Prop({ default: 'player' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationOtp?: string;

  @Prop()
  emailVerificationOtpExpires?: Date;

  @Prop()
  resetPasswordOtp?: string;

  @Prop()
  resetPasswordOtpExpires?: Date;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ unique: true, sparse: true })
  steamId?: string;

  @Prop({ default: 'EUROPE' })
  region: string;

  @Prop({ default: 'TUNISIA' })
  country: string;

  @Prop()
  avatar?: string;

  @Prop()
  refreshToken?: string;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop({ default: false })
  isReported: boolean;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ unique: true, sparse: true })
  walletAddress?: string;

  @Prop({
    type: [{ reportedBy: String, reason: String, createdAt: Date }],
    default: [],
  })
  reports: { reportedBy: string; reason: string; createdAt: Date }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
