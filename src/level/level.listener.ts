import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LevelService } from './level.service';
import { PlayerGameProfileService } from '../player/services/player-game-profile.service';

@Injectable()
export class LevelListener {
  private readonly logger = new Logger(LevelListener.name);

  constructor(
    private readonly levelService: LevelService,
    private readonly playerGameProfileService: PlayerGameProfileService,
  ) {}

  @OnEvent('match.completed')
  async handleMatchCompleted(payload: {
    matchId: string;
    userId: string;
    mode: 'RANKED' | 'UNRANKED';
    won: boolean;
    score?: number;
    gameId?: string;
    partyId?: string;
    xpAmount?: number;
  }) {
    this.logger.log(`Handling match.completed for user ${payload.userId}`);
    const xpResult = await this.levelService.applyEvent({
      id: `match_${payload.matchId}`,
      userId: payload.userId,
      type: 'MATCH_COMPLETED',
      payload: {
        mode: payload.mode,
        won: payload.won,
        stats: payload.score ? { score: payload.score } : undefined,
      },
    });

    if (payload.gameId) {
      const xpAmount = payload.xpAmount ?? xpResult?.addedXP ?? (payload.won ? 150 : 50);
      await this.playerGameProfileService.addXp(
        payload.userId,
        payload.gameId,
        xpAmount,
      );
    }
  }

  @OnEvent('mission.completed')
  async handleMissionCompleted(payload: {
    userId: string;
    missionId: string;
    xpReward: number;
    eventId?: string;
  }) {
    this.logger.log(`Handling mission.completed for user ${payload.userId}`);
    await this.levelService.applyEvent({
      id: payload.eventId ?? `mission_${payload.missionId}_${Date.now()}`,
      userId: payload.userId,
      type: 'MISSION_COMPLETED',
      payload: {
        missionId: payload.missionId,
        reward: payload.xpReward,
      },
    });
  }

  @OnEvent('achievement.unlocked')
  async handleAchievementUnlocked(payload: {
    userId: string;
    achievementId: string;
    xpReward: number;
  }) {
    this.logger.log(`Handling achievement.unlocked for user ${payload.userId}`);
    await this.levelService.applyEvent({
      id: `achievement_${payload.achievementId}_${payload.userId}`,
      userId: payload.userId,
      type: 'ACHIEVEMENT_UNLOCKED',
      payload: {
        achievementId: payload.achievementId,
        reward: payload.xpReward,
      },
    });
  }
}
