import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RankTierConfig,
  TierName,
} from '../rank/schemas/rank-tier-config.schema';

/**
 * Seed script to populate rank tier configurations
 * Run with: npm run seed:rank-tiers
 */

const TIER_CONFIGURATIONS = [
  {
    tier: TierName.IRON,
    minElo: 0,
    maxElo: 999,
    color: '#6B7280', // Gray
    divisions: 3,
    displayOrder: 1,
  },
  {
    tier: TierName.BRONZE,
    minElo: 1000,
    maxElo: 1999,
    color: '#CD7F32', // Bronze
    divisions: 3,
    displayOrder: 2,
  },
  {
    tier: TierName.SILVER,
    minElo: 2000,
    maxElo: 2999,
    color: '#C0C0C0', // Silver
    divisions: 3,
    displayOrder: 3,
  },
  {
    tier: TierName.GOLD,
    minElo: 3000,
    maxElo: 3999,
    color: '#FFD700', // Gold
    divisions: 3,
    displayOrder: 4,
  },
  {
    tier: TierName.PLATINUM,
    minElo: 4000,
    maxElo: 4999,
    color: '#5DADE2', // Light Blue
    divisions: 3,
    displayOrder: 5,
  },
  {
    tier: TierName.DIAMOND,
    minElo: 5000,
    maxElo: 5999,
    color: '#B9F2FF', // Cyan
    divisions: 3,
    displayOrder: 6,
  },
  {
    tier: TierName.MASTER,
    minElo: 6000,
    maxElo: 6999,
    color: '#9B59B6', // Purple
    divisions: 2,
    displayOrder: 7,
  },
  {
    tier: TierName.GRANDMASTER,
    minElo: 7000,
    maxElo: 7999,
    color: '#E74C3C', // Red
    divisions: 2,
    displayOrder: 8,
  },
  {
    tier: TierName.CHALLENGER,
    minElo: 8000,
    maxElo: undefined, // No upper limit
    color: '#F1C40F', // Bright Gold
    divisions: 1,
    displayOrder: 9,
  },
];

async function seedRankTiers() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const rankTierConfigModel = app.get<Model<RankTierConfig>>(
      'RankTierConfigModel',
    );

    console.log('🎯 Starting rank tier configuration seeding...');

    for (const config of TIER_CONFIGURATIONS) {
      await rankTierConfigModel.findOneAndUpdate(
        { tier: config.tier, game: null }, // Global config (not game-specific)
        {
          ...config,
          game: null,
          isActive: true,
        },
        { upsert: true, new: true },
      );

      console.log(
        `✅ Seeded tier: ${config.tier} (${config.minElo} - ${config.maxElo || '∞'} ELO)`,
      );
    }

    console.log('🎉 Rank tier configuration seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding rank tiers:', error);
  } finally {
    await app.close();
  }
}

seedRankTiers();
