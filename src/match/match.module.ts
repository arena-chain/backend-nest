import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { EloService } from './elo.service';
import { StandingsModule } from '../standings/standings.module';
import { LeagueRuleModule } from '../season-rule/season-rule.module';
import { SeasonModule } from '../season/season.module';
import { LeagueRegistrationModule } from '../league-registration/league-registration.module';
import { BracketModule } from '../bracket/bracket.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
        StandingsModule,
        LeagueRuleModule,
        SeasonModule,
        LeagueRegistrationModule,
        BracketModule,
    ],
    controllers: [MatchController],
    providers: [MatchService, EloService],
    exports: [MatchService],
})
export class MatchModule {}
