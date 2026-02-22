import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bracket, BracketSchema } from './schemas/bracket.schema';
import { BracketService } from './bracket.service';
import { BracketController } from './bracket.controller';
import { StandingsModule } from '../standings/standings.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Bracket.name, schema: BracketSchema }]),
        StandingsModule,
    ],
    controllers: [BracketController],
    providers: [BracketService],
    exports: [BracketService],
})
export class BracketModule {}
