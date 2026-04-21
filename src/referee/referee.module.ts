// src/referee/referee.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RefereeService } from './referee.service';
import { RefereeController } from './referee.controller';
import {
  RefereeProfile,
  RefereeProfileSchema,
} from './schemas/referee-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefereeProfile.name, schema: RefereeProfileSchema },
    ]),
  ],
  controllers: [RefereeController],
  providers: [RefereeService],
  exports: [RefereeService],
})
export class RefereeModule {}
