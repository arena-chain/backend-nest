import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NftDocument = Nft & Document;

@Schema({ timestamps: true })
export class Nft {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'NftCollection' })
  collectionId?: Types.ObjectId;

  @Prop({
    enum: [
      'WEAPON',
      'AVATAR',
      'SKIN',
      'CHARACTER',
      'CONSUMABLE',
      'BADGE',
      'TROPHY',
      'EMOTE',
      'ARMOR',
      'ACCESSORY',
      'OTHER',
    ],
    default: 'OTHER',
  })
  category: string;

  @Prop({
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
    default: 'COMMON',
  })
  rarity: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Catalog' }], default: [] })
  compatibleGames: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  contractAddress?: string;

  @Prop()
  tokenId?: string;

  @Prop()
  transactionHash?: string;

  @Prop({
    enum: ['DRAFT', 'MINTED', 'LISTED', 'BURNED'],
    default: 'DRAFT',
  })
  status: string;

  @Prop()
  mintedAt?: Date;

  @Prop({ default: true })
  isEquippable: boolean;

  @Prop({ default: false })
  isConsumable: boolean;

  @Prop({ default: true })
  isTradeable: boolean;

  @Prop({ default: 1 })
  supply: number;

  @Prop({ default: 0 })
  maxSupply: number;

  @Prop()
  externalUrl?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const NftSchema = SchemaFactory.createForClass(Nft);
