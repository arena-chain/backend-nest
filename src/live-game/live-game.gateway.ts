import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@WebSocketGateway({
    namespace: '/live-game',
    cors: { origin: '*' },
})
export class LiveGameGateway {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(LiveGameGateway.name);

    broadcastGameState(
        activePlayer: Record<string, unknown>,
        gameData: Record<string, unknown>,
        localPlayerData: Record<string, unknown> = {},
        orderTeam: unknown[] = [],
        chaosTeam: unknown[] = [],
    ) {
        try {
            const scores = (localPlayerData?.scores as Record<string, unknown>) || {};
            const payload = {
                summonerName: String(
                    activePlayer?.summonerName ?? localPlayerData?.summonerName ?? '',
                ),
                championName: String(
                    localPlayerData?.championName ?? activePlayer?.championName ?? '',
                ),
                level: Number(activePlayer?.level ?? 0),
                kills: Number(scores?.kills ?? 0),
                deaths: Number(scores?.deaths ?? 0),
                assists: Number(scores?.assists ?? 0),
                creepScore: Number(scores?.creepScore ?? 0),
                gold: Number(activePlayer?.currentGold ?? 0),
                gameTime: Number(gameData?.gameTime ?? 0),
                gameMode: String(gameData?.gameMode ?? ''),
                team: String(localPlayerData?.team ?? ''),
                // orderTeam and chaosTeam are passed through as-is from Electron.
                // Each player object now includes: isDead, respawnTimer, items[]
                orderTeam: orderTeam ?? [],
                chaosTeam: chaosTeam ?? [],
            };
            console.log('[Gateway] Broadcasting game-state:', JSON.stringify(payload));
            this.server.emit('game-state', payload);
        } catch (e) {
            this.logger.warn(`broadcastGameState failed: ${e}`);
        }
    }

    broadcastEvent(event: Record<string, unknown>) {
        this.server.emit('game-event', event);
    }

    broadcastGameEnded() {
        this.server.emit('game-ended', { ended: true });
    }

    broadcastGameStarted() {
        this.server.emit('game-started', { phase: 'InProgress' });
    }
}
