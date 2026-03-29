import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema({ timestamps: true })
export class Inventory {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'NftItem' }], default: [] })
    items: Types.ObjectId[];

    @Prop({
        type: [{
            nftItemId: { type: Types.ObjectId, ref: 'NftItem' },
            slot: { type: String },
            equippedAt: { type: Date, default: Date.now },
        }],
        default: [],
    })
    equippedItems: {
        nftItemId: Types.ObjectId;
        slot: string;
        equippedAt: Date;
    }[];

    @Prop({ type: Types.ObjectId, ref: 'Catalog' })
    activeGameId?: Types.ObjectId;

    @Prop()
    walletAddress?: string;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
