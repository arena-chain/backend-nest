import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { TrainingResult, TrainingResultSchema } from './schemas/training-result.schema';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [
    MissionModule,
    MongooseModule.forFeature([
      { name: TrainingResult.name, schema: TrainingResultSchema },
    ]),
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
