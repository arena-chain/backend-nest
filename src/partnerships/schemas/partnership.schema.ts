import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartnershipDocument = Partnership & Document;

@Schema({ timestamps: true })
export class Partnership {
    @Prop({ required: true })
    name: string;

    @Prop()
    logo: string;

    @Prop({ enum: ['Event Sponsor', 'Platform Sponsor'], required: true })
    type: string;


    @Prop()
    description: string;

    @Prop()
    website: string;
}

export const PartnershipSchema = SchemaFactory.createForClass(Partnership);
