import { Module } from '@nestjs/common';
import { TournementsService } from './tournements.service';
import { TournementsController } from './tournements.controller';

@Module({
  controllers: [TournementsController],
  providers: [TournementsService],
})
export class TournementsModule {}
