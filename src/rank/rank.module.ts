import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RankService } from './rank.service';
import { RankController } from './rank.controller';
import { PlayerRank, PlayerRankSchema } from './schemas/rank.schema';
import { RankHistory, RankHistorySchema } from './schemas/rank-history.schema';
import { Penalty, PenaltySchema } from './schemas/penalty.schema';
import { RankTierConfig, RankTierConfigSchema } from './schemas/rank-tier-config.schema';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([
      { name: PlayerRank.name, schema: PlayerRankSchema },
      { name: RankHistory.name, schema: RankHistorySchema },
      { name: Penalty.name, schema: PenaltySchema },
      { name: RankTierConfig.name, schema: RankTierConfigSchema },
    ]),
  ],
  controllers: [RankController],
  providers: [RankService],
  exports: [RankService], // Export service for use in other modules
})
export class RankModule { }
