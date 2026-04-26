import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { Game, GameSchema } from '../games/entities/game.entity';
import {
    MatchmakingTicket,
    MatchmakingTicketSchema,
} from './schemas/matchmaking-ticket.schema';
import { PlayerRank, PlayerRankSchema } from '../rank/schemas/rank.schema';
import { Catalog, CatalogSchema } from '../catalog/schemas/catalog.entity';
import { User, UserSchema } from '../user/schemas/user.schema';
import { PlayerProfile, PlayerProfileSchema } from '../player/schemas/player-profile.schema';
import { RankModule } from '../rank/rank.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Game.name, schema: GameSchema },
            { name: MatchmakingTicket.name, schema: MatchmakingTicketSchema },
            { name: PlayerRank.name, schema: PlayerRankSchema },
            { name: Catalog.name, schema: CatalogSchema },
            { name: User.name, schema: UserSchema },
            { name: PlayerProfile.name, schema: PlayerProfileSchema },
        ]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'yourSecretKey',
            }),
            inject: [ConfigService],
        }),
        ConfigModule,
        RankModule,
    ],
    controllers: [MatchmakingController],
    providers: [MatchmakingService, MatchmakingGateway],
    exports: [MatchmakingService],
})
export class MatchmakingModule {}
