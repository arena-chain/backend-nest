import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LevelService } from './level.service';
import { LevelController } from './level.controller';
import { LevelListener } from './level.listener';
import { PlayerLevel, PlayerLevelSchema } from './schemas/player-level.schema';
import { PlayerModule } from '../player/player.module';
import {
  ProcessedXpEvent,
  ProcessedXpEventSchema,
} from './schemas/processed-xp-event.schema';

@Module({
  imports: [
    PlayerModule,
    MongooseModule.forFeature([
      { name: PlayerLevel.name, schema: PlayerLevelSchema },
      { name: ProcessedXpEvent.name, schema: ProcessedXpEventSchema },
    ]),
  ],
  controllers: [LevelController],
  providers: [LevelService, LevelListener],
  exports: [LevelService],
})
export class LevelModule {}
