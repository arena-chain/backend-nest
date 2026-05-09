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
      orderTeam?: unknown[];
      chaosTeam?: unknown[];
    },
  ) {
    const {
      activePlayer,
      gameData,
      newEvents,
      localPlayerData,
      orderTeam,
      chaosTeam,
    } = body;
    if (Array.isArray(newEvents)) {
      for (const ev of newEvents) {
        if (ev && typeof ev === 'object' && !Array.isArray(ev)) {
          this.liveGameGateway.broadcastEvent(ev as Record<string, unknown>);
        }
      }
    }
    if (activePlayer && gameData) {
      const local =
        localPlayerData &&
        typeof localPlayerData === 'object' &&
        !Array.isArray(localPlayerData)
          ? localPlayerData
          : {};
      const ord = Array.isArray(orderTeam) ? orderTeam : [];
      const ch = Array.isArray(chaosTeam) ? chaosTeam : [];
      this.liveGameGateway.broadcastGameState(
        activePlayer,
        gameData,
        local,
        ord,
        ch,
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
