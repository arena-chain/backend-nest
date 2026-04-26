import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
    VALID = 'VALID',
    USED = 'USED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
    PENDING = 'PENDING',
}

@Schema({ timestamps: true })
export class Ticket {
    @Prop({ required: true, unique: true })
    ticketNumber: string;

    @Prop({ type: Types.ObjectId, ref: 'Tournament', required: true })
    tournament: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ enum: TicketStatus, default: TicketStatus.VALID })
    status: TicketStatus;

    @Prop({ required: true })
    price: number;

    @Prop()
    purchaseDate: Date;

    @Prop({ required: true })
    qrCode: string; // Base64 data URL

    @Prop()
    type: string; // e.g. "VIP", "Standard"

    @Prop()
    perks: string;

    @Prop()
    usedAt: Date;

    @Prop()
    expiresAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
