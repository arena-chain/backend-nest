import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeagueController } from './league.controller';
import { LeagueService } from './league.service';
import { League, LeagueSchema } from './schemas/league.schema';
import {
  LeagueParticipant,
  LeagueParticipantSchema,
} from './schemas/league-participant.schema';
import { PlayerModule } from '../player/player.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: League.name, schema: LeagueSchema },
      { name: LeagueParticipant.name, schema: LeagueParticipantSchema },
    ]),
    PlayerModule,
    TicketsModule,
  ],
  controllers: [LeagueController],
  providers: [LeagueService],
  exports: [LeagueService],
})
export class LeagueModule {}
