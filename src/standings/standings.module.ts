import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StandingsService } from './standings.service';
import { StandingsController } from './standings.controller';
import { Standings, StandingsSchema } from './schemas/standings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Standings.name, schema: StandingsSchema },
    ]),
  ],
  controllers: [StandingsController],
  providers: [StandingsService],
  exports: [StandingsService], // exported so MatchModule can inject it
})
export class StandingsModule {}
