import { Module } from '@nestjs/common';
import { LiveGameController } from './live-game.controller';
import { LiveGameGateway } from './live-game.gateway';

@Module({
    controllers: [LiveGameController],
    providers: [LiveGameGateway],
    exports: [LiveGameGateway],
})
export class LiveGameModule {}
