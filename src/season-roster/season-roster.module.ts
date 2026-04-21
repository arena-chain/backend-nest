import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SeasonRoster,
  SeasonRosterSchema,
} from './schemas/season-roster.schema';
import { SeasonRosterService } from './season-roster.service';
import { SeasonRosterController } from './season-roster.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SeasonRoster.name, schema: SeasonRosterSchema },
    ]),
  ],
  controllers: [SeasonRosterController],
  providers: [SeasonRosterService],
  exports: [SeasonRosterService],
})
export class SeasonRosterModule {}
