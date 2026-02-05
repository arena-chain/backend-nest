import { Module } from '@nestjs/common';
import { LigueService } from './ligue.service';
import { LigueController } from './ligue.controller';

@Module({
  controllers: [LigueController],
  providers: [LigueService],
})
export class LigueModule {}
