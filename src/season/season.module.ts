import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Season, SeasonSchema } from './schemas/season.schema';
import { SeasonService } from './season.service';
import { SeasonController } from './season.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Season.name, schema: SeasonSchema }]),
  ],
  controllers: [SeasonController],
  providers: [SeasonService],
  exports: [SeasonService, MongooseModule],
})
export class SeasonModule {}
