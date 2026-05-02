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

export enum TicketCategory {
  STANDARD = 'STANDARD',
  NFT = 'NFT',
}


@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true, unique: true })
  ticketNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Tournament', required: false })
  tournament: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'League', required: false })
  league: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ enum: TicketCategory, default: TicketCategory.STANDARD })
  category: TicketCategory;


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
