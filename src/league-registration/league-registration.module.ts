import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeagueRegistrationService } from './league-registration.service';
import { LeagueRegistrationController } from './league-registration.controller';
import { SeasonTeam, SeasonTeamSchema } from './schemas/season-team.schema';
import { SeasonModule } from '../season/season.module';
import { LeagueRuleModule } from '../league-rule/league-rule.module';
import { StandingsModule } from '../standings/standings.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: SeasonTeam.name, schema: SeasonTeamSchema }]),
        SeasonModule,
        LeagueRuleModule,
        StandingsModule,
    ],
    controllers: [LeagueRegistrationController],
    providers: [LeagueRegistrationService],
    exports: [LeagueRegistrationService],
})
export class LeagueRegistrationModule {}
