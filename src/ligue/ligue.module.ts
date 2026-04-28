import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LigueService } from './ligue.service';
import { LigueController } from './ligue.controller';
import { Ligue, LigueSchema } from './entities/ligue.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ligue.name, schema: LigueSchema }]),
  ],
  controllers: [LigueController],
  providers: [LigueService],
})
export class LigueModule {}
