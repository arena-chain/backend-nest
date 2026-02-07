import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CatalogDocument = Catalog & Document;

@Schema({ timestamps: true })
export class Catalog {
    @Prop({ required: true })
    title: string;

    @Prop()
    description?: string;

    @Prop({ required: true })
    genre: string;

    @Prop()
    publisher?: string;

    @Prop({ type: [String], default: [] })
    platforms: string[];

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    releaseDate?: Date;

    @Prop()
    coverImageUrl?: string;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;
}

export const CatalogSchema = SchemaFactory.createForClass(Catalog);

// Create indexes
CatalogSchema.index({ title: 1 });
CatalogSchema.index({ genre: 1 });
