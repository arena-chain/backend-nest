import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
<<<<<<< HEAD
import { LeagueController } from './league.controller';
import { LeagueService } from './league.service';
import { League, LeagueSchema } from './schemas/league.schema';
import { LeagueParticipant, LeagueParticipantSchema } from './schemas/league-participant.schema';
import { PlayerModule } from '../player/player.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: League.name, schema: LeagueSchema },
            { name: LeagueParticipant.name, schema: LeagueParticipantSchema },
        ]),
        PlayerModule,
    ],
    controllers: [LeagueController],
    providers: [LeagueService],
    exports: [LeagueService],
=======
import { LeagueService } from './league.service';
import { LeagueController } from './league.controller';
import { League, LeagueSchema } from './schemas/league.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: League.name, schema: LeagueSchema }]),
  ],
  controllers: [LeagueController],
  providers: [LeagueService],
>>>>>>> origin/live_stream
})
export class LeagueModule { }
