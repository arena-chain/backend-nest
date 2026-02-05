import { Module } from '@nestjs/common';
import { AbonnementService } from './abonnement.service';
import { AbonnementController } from './abonnement.controller';

@Module({
  controllers: [AbonnementController],
  providers: [AbonnementService],
})
export class AbonnementModule {}
