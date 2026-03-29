import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RiotApiController } from './riot-api.controller';
import { RiotApiService } from './riot-api.service';
import { PlayerModule } from '../player/player.module';

@Module({
    imports: [
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
        ConfigModule,
        PlayerModule,
    ],
    controllers: [RiotApiController],
    providers: [RiotApiService],
    exports: [RiotApiService],
})
export class RiotApiModule { }
