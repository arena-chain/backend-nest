import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LiveGameGateway } from './live-game.gateway';

@Controller('live-game')
export class LiveGameController {
    constructor(private readonly liveGameGateway: LiveGameGateway) {}

    @Post('update')
    @HttpCode(HttpStatus.OK)
    async update(
        @Body()
        body: {
            activePlayer?: Record<string, unknown>;
            gameData?: Record<string, unknown>;
            localPlayerData?: Record<string, unknown>;
            localPlayerName?: string;
            newEvents?: unknown[];
        },
    ) {
        const { activePlayer, gameData, newEvents, localPlayerData } = body;
        if (Array.isArray(newEvents)) {
            for (const ev of newEvents) {
                if (ev && typeof ev === 'object' && !Array.isArray(ev)) {
                    this.liveGameGateway.broadcastEvent(ev as Record<string, unknown>);
                }
            }
        }
        if (activePlayer && gameData) {
            this.liveGameGateway.broadcastGameState(
                activePlayer,
                gameData,
                (localPlayerData && typeof localPlayerData === 'object' && !Array.isArray(localPlayerData)
                    ? localPlayerData
                    : {}) as Record<string, unknown>,
            );
        }
        return { ok: true };
    }

    @Post('ended')
    @HttpCode(HttpStatus.OK)
    async ended() {
        this.liveGameGateway.broadcastGameEnded();
        return { ok: true };
    }

    @Post('phase')
    @HttpCode(HttpStatus.OK)
    async phase(@Body() body: { phase?: string }) {
        const phase = String(body?.phase ?? '').trim();
        if (phase === 'InProgress') {
            this.liveGameGateway.broadcastGameStarted();
        } else if (phase === 'EndOfGame' || phase === 'None' || phase === 'Lobby') {
            this.liveGameGateway.broadcastGameEnded();
        }
        return { ok: true };
    }
}
