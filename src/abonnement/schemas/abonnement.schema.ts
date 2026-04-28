import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AbonnementDocument = Abonnement & Document;

@Schema({ timestamps: true })
export class Abonnement {
  @Prop({ required: true, enum: ['Free', 'Pro', 'Premium'], unique: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  durationInMonths: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop()
  description: string;
}

export const AbonnementSchema = SchemaFactory.createForClass(Abonnement);
