// src/player/player.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import {
  PlayerProfile,
  PlayerProfileSchema,
} from './schemas/player-profile.schema';
import {
  PlayerGameProfile,
  PlayerGameProfileSchema,
} from './schemas/player-game-profile.schema';
import { Game, GameSchema } from '../games/entities/game.entity';
import { PlayerGameProfileService } from './services/player-game-profile.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'yourSecretKey',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: PlayerProfile.name, schema: PlayerProfileSchema },
      { name: PlayerGameProfile.name, schema: PlayerGameProfileSchema },
      { name: Game.name, schema: GameSchema },
    ]),
  ],
  controllers: [PlayerController],
  providers: [PlayerService, PlayerGameProfileService],
  exports: [PlayerService, PlayerGameProfileService],
})
export class PlayerModule {}
