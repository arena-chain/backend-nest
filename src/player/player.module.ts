// src/player/player.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { PlayerProfile, PlayerProfileSchema } from './schemas/player-profile.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PlayerProfile.name, schema: PlayerProfileSchema },
        ]),
    ],
    controllers: [PlayerController],
    providers: [PlayerService],
    exports: [PlayerService],
})
export class PlayerModule { }
