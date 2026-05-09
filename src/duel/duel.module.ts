import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DuelService } from './duel.service';
import { DuelGateway } from './duel.gateway';
import { DuelSession, DuelSessionSchema } from './schemas/duel-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DuelSession.name, schema: DuelSessionSchema }]),
  ],
  providers: [DuelService, DuelGateway],
  exports: [DuelService],
})
export class DuelModule {}
