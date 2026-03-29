import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartnershipDocument = Partnership & Document;

@Schema({ timestamps: true })
export class Partnership {
    @Prop({ required: true })
    name: string;

    @Prop()
    logo: string;

<<<<<<< HEAD
    @Prop({ enum: ['Event Sponsor', 'Platform Sponsor'], required: true })
    type: string;

=======
    @Prop({ enum: ['Title Sponsor', 'Event Sponsor', 'Platform Sponsor', 'Media Partner'], required: true })
    type: string;


>>>>>>> origin/live_stream
    @Prop()
    description: string;

    @Prop()
    website: string;
}

export const PartnershipSchema = SchemaFactory.createForClass(Partnership);
