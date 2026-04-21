import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ScouterProfile,
  ScouterProfileSchema,
} from './schemas/scouter-profile.schema';
import {
  SeasonRoster,
  SeasonRosterSchema,
} from '../season-roster/schemas/season-roster.schema';
import { ScouterService } from './scouter.service';
import { ScouterController } from './scouter.controller';
import { PlayerModule } from '../player/player.module';
import { MatchModule } from '../match/match.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScouterProfile.name, schema: ScouterProfileSchema },
      { name: SeasonRoster.name, schema: SeasonRosterSchema },
    ]),
    PlayerModule,
    MatchModule,
  ],
  controllers: [ScouterController],
  providers: [ScouterService],
  exports: [ScouterService],
})
export class ScouterModule {}
