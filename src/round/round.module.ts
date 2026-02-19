import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Round, RoundSchema } from './schemas/round.schema';
import { RoundService } from './round.service';
import { RoundController } from './round.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: Round.name, schema: RoundSchema }])],
    controllers: [RoundController],
    providers: [RoundService],
    exports: [RoundService],
})
export class RoundModule { }
