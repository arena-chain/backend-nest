import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetPresetDocument = AssetPreset & Document;

/** User-saved configuration (not minted / not on-chain). */
@Schema({ timestamps: true })
export class AssetPreset {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Nft' })
    baseNftId?: Types.ObjectId;

    /** Optional path from game-assets scan (e.g. weapens/cs2/ak-47-based.glb) */
    @Prop()
    assetPath?: string;

    @Prop({ type: Object, default: {} })
    config: Record<string, any>;

    @Prop()
    previewImageUrl?: string;
}

export const AssetPresetSchema = SchemaFactory.createForClass(AssetPreset);
