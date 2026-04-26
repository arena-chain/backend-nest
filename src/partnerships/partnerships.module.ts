import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PartnershipsService } from './partnerships.service';
import { PartnershipsController } from './partnerships.controller';
import { Partnership, PartnershipSchema } from './schemas/partnership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Partnership.name, schema: PartnershipSchema }]),
  ],
  controllers: [PartnershipsController],
  providers: [PartnershipsService],
})
export class PartnershipsModule { }
