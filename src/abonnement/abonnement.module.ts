import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AbonnementService } from './abonnement.service';
import { AbonnementController } from './abonnement.controller';
import { Abonnement, AbonnementSchema } from './schemas/abonnement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Abonnement.name, schema: AbonnementSchema }]),
  ],
  controllers: [AbonnementController],
  providers: [AbonnementService],
  exports: [AbonnementService],
})
export class AbonnementModule { }
