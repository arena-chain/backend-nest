import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameAssetsService } from './game-assets.service';
import { GameAssetsController } from './game-assets.controller';

@Module({
    imports: [ConfigModule],
    controllers: [GameAssetsController],
    providers: [GameAssetsService],
    exports: [GameAssetsService],
})
export class GameAssetsModule {}
