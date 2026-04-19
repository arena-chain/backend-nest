import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NftItemDocument = NftItem & Document;

@Schema({ timestamps: true })
export class NftItem {
    @Prop({ type: Types.ObjectId, ref: 'Nft', required: true })
    nftId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    ownerId: Types.ObjectId;

    @Prop()
    walletAddress?: string;

    @Prop()
    tokenId?: string;

    @Prop()
    transactionHash?: string;

    @Prop({ default: 1 })
    edition: number;

    @Prop({
        enum: ['OWNED', 'EQUIPPED', 'LISTED', 'TRANSFERRED', 'BURNED'],
        default: 'OWNED',
    })
    status: string;

    @Prop()
    acquiredAt?: Date;

    @Prop({
        enum: ['MINTED', 'PURCHASED', 'REWARD', 'TRANSFER', 'AIRDROP'],
        default: 'MINTED',
    })
    acquiredVia: string;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;

    @Prop({ default: 0 })
    listPrice: number;

    @Prop({ default: false })
    isFeatured: boolean;
}

export const NftItemSchema = SchemaFactory.createForClass(NftItem);
