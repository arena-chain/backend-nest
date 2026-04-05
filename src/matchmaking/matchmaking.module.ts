import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { Game, GameSchema } from '../games/entities/game.entity';
import {
    MatchmakingTicket,
    MatchmakingTicketSchema,
} from './schemas/matchmaking-ticket.schema';
import { PlayerRank, PlayerRankSchema } from '../rank/schemas/rank.schema';
import { Catalog, CatalogSchema } from '../catalog/schemas/catalog.entity';
import { RankModule } from '../rank/rank.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Game.name, schema: GameSchema },
            { name: MatchmakingTicket.name, schema: MatchmakingTicketSchema },
            { name: PlayerRank.name, schema: PlayerRankSchema },
            { name: Catalog.name, schema: CatalogSchema },
        ]),
        RankModule,
    ],
    controllers: [MatchmakingController],
    providers: [MatchmakingService],
    exports: [MatchmakingService],
})
export class MatchmakingModule {}
