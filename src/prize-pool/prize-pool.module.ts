import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrizePool, PrizePoolSchema } from './schemas/prize-pool.schema';
import { PrizePoolService } from './prize-pool.service';
import { PrizePoolController } from './prize-pool.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: PrizePool.name, schema: PrizePoolSchema }]),
    ],
    controllers: [PrizePoolController],
    providers: [PrizePoolService],
    exports: [PrizePoolService],
})
export class PrizePoolModule {}
