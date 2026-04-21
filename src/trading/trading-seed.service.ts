import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TradingAsset } from './schemas/asset.schema';

@Injectable()
export class TradingSeedService implements OnModuleInit {
  constructor(
    @InjectModel(TradingAsset.name) private assetModel: Model<TradingAsset>,
  ) {}

  async onModuleInit() {
    const count = await this.assetModel.countDocuments();
    if (count === 0) {
      await this.seedAssets();
    }
  }

  private async seedAssets() {
    const assets = [
      {
        name: 'Scream (Player Token)',
        symbol: 'SCREAM',
        type: 'PLAYER_TOKEN',
        refModel: 'User',
        lastPrice: 15.5,
        priceChange24h: 2.5,
        volume24h: 5000,
        imageUrl:
          'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png',
        stats: { winRate: 68, matchesPlayed: 450, ranking: 12 },
      },
      {
        name: 'Team Liquid (Team Token)',
        symbol: 'TLQD',
        type: 'TEAM_TOKEN',
        refModel: 'Team',
        lastPrice: 42.0,
        priceChange24h: -1.2,
        volume24h: 12000,
        imageUrl:
          'https://cdn.pixabay.com/photo/2017/01/31/21/23/avatar-2027366_1280.png',
        stats: { winRate: 72, matchesPlayed: 1200, ranking: 3 },
      },
      {
        name: 'Dragon Lore AWP (Skin NFT)',
        symbol: 'DLORE',
        type: 'NFT',
        refModel: 'Nft',
        lastPrice: 2500,
        priceChange24h: 5.0,
        volume24h: 75000,
        imageUrl:
          'https://cdn.pixabay.com/photo/2018/01/14/23/12/nature-3082832_1280.jpg',
        stats: { rarity: 'Mythic' },
      },
      {
        name: 'Major Paris 2026 (VIP Pass)',
        symbol: 'PARIS26',
        type: 'EVENT_TICKET',
        refModel: 'Item',
        lastPrice: 150.0,
        priceChange24h: 0,
        volume24h: 2000,
        imageUrl:
          'https://cdn.pixabay.com/photo/2016/11/23/15/48/audience-1853662_1280.jpg',
        stats: { rarity: 'Legendary' },
      },
    ];

    await this.assetModel.insertMany(assets);
    console.log('Trading assets seeded successfully');
  }
}
