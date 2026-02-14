import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../common/enums/role.enum';

export type RegistrationDocument = Registration & Document;

@Schema({ timestamps: true })
export class Registration {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ required: true })
    nickname: string;

    @Prop({ default: 'EUROPE' })
    region: string;

    @Prop({ required: true, enum: UserRole })
    role: string;

    @Prop({ type: Object })
    roleData: any;

    @Prop({ required: true })
    otp: string;

    @Prop({ required: true })
    otpExpires: Date;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);
RegistrationSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired
