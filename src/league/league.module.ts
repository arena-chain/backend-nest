import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeagueService } from './league.service';
import { LeagueController } from './league.controller';
import { League, LeagueSchema } from './schemas/league.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: League.name, schema: LeagueSchema }]),
  ],
  controllers: [LeagueController],
  providers: [LeagueService],
})
export class LeagueModule { }
