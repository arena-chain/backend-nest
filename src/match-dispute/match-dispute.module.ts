import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MatchDispute,
  MatchDisputeSchema,
} from './schemas/match-dispute.schema';
import { MatchDisputeService } from './match-dispute.service';
import { MatchDisputeController } from './match-dispute.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MatchDispute.name, schema: MatchDisputeSchema },
    ]),
  ],
  controllers: [MatchDisputeController],
  providers: [MatchDisputeService],
  exports: [MatchDisputeService],
})
export class MatchDisputeModule {}
