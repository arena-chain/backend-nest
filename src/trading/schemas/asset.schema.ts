import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetType = 'NFT' | 'PLAYER_TOKEN' | 'TEAM_TOKEN' | 'EVENT_TICKET';

@Schema({ timestamps: true })
export class TradingAsset extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({
    required: true,
    enum: ['NFT', 'PLAYER_TOKEN', 'TEAM_TOKEN', 'EVENT_TICKET'],
  })
  type: AssetType;

  @Prop({ required: true })
  refModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'refModel' })
  referenceId: Types.ObjectId;

  @Prop({ default: 0 })
  lastPrice: number;

  @Prop({ default: 0 })
  priceChange24h: number;

  @Prop({ default: 0 })
  volume24h: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  stats: {
    winRate?: number;
    matchesPlayed?: number;
    ranking?: number;
    rarity?: string;
  };

  @Prop()
  imageUrl: string;
}

export const TradingAssetSchema = SchemaFactory.createForClass(TradingAsset);
