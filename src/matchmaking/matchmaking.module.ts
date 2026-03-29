import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { Game, GameSchema } from '../games/entities/game.entity';
import {
    MatchmakingTicket,
    MatchmakingTicketSchema,
} from './schemas/matchmaking-ticket.schema';
import {
    PlayerProfile,
    PlayerProfileSchema,
} from '../player/schemas/player-profile.schema';
import { Catalog, CatalogSchema } from '../catalog/schemas/catalog.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Game.name, schema: GameSchema },
            { name: MatchmakingTicket.name, schema: MatchmakingTicketSchema },
            { name: PlayerProfile.name, schema: PlayerProfileSchema },
            { name: Catalog.name, schema: CatalogSchema },
        ]),
    ],
    controllers: [MatchmakingController],
    providers: [MatchmakingService],
    exports: [MatchmakingService],
})
export class MatchmakingModule {}
