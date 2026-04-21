import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeagueRegistrationService } from './league-registration.service';
import { LeagueRegistrationController } from './league-registration.controller';
import { SeasonTeam, SeasonTeamSchema } from './schemas/season-team.schema';
import { Team, TeamSchema } from '../team/schemas/team.schema';
import { SeasonModule } from '../season/season.module';
import { LeagueRuleModule } from '../season-rule/season-rule.module';
import { StandingsModule } from '../standings/standings.module';
import { SeasonRosterModule } from '../season-roster/season-roster.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SeasonTeam.name, schema: SeasonTeamSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
    SeasonModule,
    LeagueRuleModule,
    StandingsModule,
    SeasonRosterModule,
  ],
  controllers: [LeagueRegistrationController],
  providers: [LeagueRegistrationService],
  exports: [LeagueRegistrationService],
})
export class LeagueRegistrationModule {}
