import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScoutingReport, ScoutingReportSchema } from './schemas/scouting-report.schema';
import { PlayerProspectStatus, PlayerProspectStatusSchema } from './schemas/player-prospect-status.schema';
import { PlayerRecommendation, PlayerRecommendationSchema } from './schemas/player-recommendation.schema';
import { Watchlist, WatchlistSchema } from './schemas/watchlist.schema';
import { SeasonRoster, SeasonRosterSchema } from '../season-roster/schemas/season-roster.schema';
import { ScoutingService } from './scouting.service';
import { ScoutingController } from './scouting.controller';
import { PlayerModule } from '../player/player.module';
import { RankModule } from '../rank/rank.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScoutingReport.name, schema: ScoutingReportSchema },
      { name: PlayerProspectStatus.name, schema: PlayerProspectStatusSchema },
      { name: PlayerRecommendation.name, schema: PlayerRecommendationSchema },
      { name: Watchlist.name, schema: WatchlistSchema },
      { name: SeasonRoster.name, schema: SeasonRosterSchema },
    ]),
    PlayerModule,
    RankModule,
  ],
  controllers: [ScoutingController],
  providers: [ScoutingService],
  exports: [ScoutingService],
})
export class ScoutingModule {}
