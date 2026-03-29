import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NftCollectionDocument = NftCollection & Document;

@Schema({ timestamps: true })
export class NftCollection {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop()
    description?: string;

    @Prop()
    imageUrl?: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    creatorId?: Types.ObjectId;

    @Prop({
        enum: ['AVATARS', 'WEAPONS', 'SKINS', 'CHARACTERS', 'BADGES', 'TROPHIES', 'ARMOR', 'ACCESSORIES', 'MIXED'],
        default: 'MIXED',
    })
    category: string;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Catalog' }], default: [] })
    compatibleGames: Types.ObjectId[];

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: 0 })
    totalMinted: number;

    @Prop({ default: 0 })
    maxSupply: number;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;
}

export const NftCollectionSchema = SchemaFactory.createForClass(NftCollection);
