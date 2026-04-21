import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Round, RoundSchema } from './schemas/round.schema';
import { Season, SeasonSchema } from '../season/schemas/season.schema';
import { RoundService } from './round.service';
import { RoundController } from './round.controller';
import { MatchModule } from '../match/match.module';
import { LeagueRegistrationModule } from '../league-registration/league-registration.module';
import { StandingsModule } from '../standings/standings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Round.name, schema: RoundSchema },
      { name: Season.name, schema: SeasonSchema },
    ]),
    MatchModule,
    LeagueRegistrationModule,
    StandingsModule,
  ],
  controllers: [RoundController],
  providers: [RoundService],
  exports: [RoundService],
})
export class RoundModule {}
