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
    ]),
  ],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
