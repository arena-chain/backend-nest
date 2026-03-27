import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketTypeDefinitionDocument = TicketTypeDefinition & Document;

@Schema({ _id: false })
export class Bundle {
    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    price: number;
}
const BundleSchema = SchemaFactory.createForClass(Bundle);

@Schema({ timestamps: true })
export class TicketTypeDefinition {
    @Prop({ required: true })
    name: string; // e.g., "VIP", "Standard"

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    capacity: number;

    @Prop()
    description?: string;

    @Prop({ type: [BundleSchema], default: [] })
    bundles: Bundle[];

    // Optional: Link to a specific tournament if this type is exclusive to it.
    // However, for reusability, we might keep it loose. 
    // But the user said "choose to create the ticket and then he will choose the tournement to assign".
    // This implies a many-to-many or one-to-many relationship. 
    // If a ticket type instance is specific to a tournament (which it usually is due to capacity/price), 
    // it effectively belongs to that tournament once assigned.
    @Prop({ type: Types.ObjectId, ref: 'Tournament' })
    tournament?: Types.ObjectId;
}

export const TicketTypeDefinitionSchema = SchemaFactory.createForClass(TicketTypeDefinition);
