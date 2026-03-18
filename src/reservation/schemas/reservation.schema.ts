import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReservationDocument = Reservation & Document;

export enum ReservationStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Reservation {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
    tournament: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Ticket' }], required: true })
    tickets: Types.ObjectId[];

    @Prop({ enum: ReservationStatus, default: ReservationStatus.PENDING })
    status: ReservationStatus;

    @Prop({ required: true })
    totalPrice: number;

    @Prop({ default: Date.now })
    reservedAt: Date;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop()
    paymentId: string;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
