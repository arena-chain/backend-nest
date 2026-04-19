import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PlayerLevel, PlayerLevelDocument } from './schemas/player-level.schema';
import { ProcessedXpEvent, ProcessedXpEventDocument } from './schemas/processed-xp-event.schema';

export type XpEventType =
  | 'MATCH_COMPLETED'
  | 'MISSION_COMPLETED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'LOGIN_DAILY'
  | 'TOURNAMENT_WIN'
  | 'TOURNAMENT_PLACE_2'
  | 'TOURNAMENT_PLACE_3'
  | 'WIN_STREAK'
  | 'MANUAL';

export interface PlayerLevelView {
  userId: string;
  level: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
}

export interface AddXpResult {
  userId: string;
  source: XpEventType;
  levelUpCount: number;
  oldLevel: number;
  newLevel: number;
  addedXP: number;
  newCurrentXP: number;
  newTotalXP: number;
}

export interface MatchCompletedPayload {
  mode: 'RANKED' | 'UNRANKED';
  won: boolean;
  stats?: { score: number };
}

export interface MissionCompletedPayload {
  missionId: string;
  reward: number;
}

export interface AchievementUnlockedPayload {
  achievementId: string;
  reward: number;
}

export interface DailyLoginPayload {
  hasDailyLoginSystem: boolean;
}

export interface XpEventBase {
  id: string;
  userId: string;
  type: XpEventType;
  createdAt?: Date;
  payload: MatchCompletedPayload | MissionCompletedPayload | AchievementUnlockedPayload | DailyLoginPayload | any;
}

@Injectable()
export class LevelService {
  private readonly base = 1000;
  private readonly growth = 1.5;

  private readonly PERFORMANCE_BONUS_ENABLED = false;

  constructor(
    @InjectModel(PlayerLevel.name)
    private readonly playerLevelModel: Model<PlayerLevelDocument>,
    @InjectModel(ProcessedXpEvent.name)
    private readonly processedXpEventModel: Model<ProcessedXpEventDocument>,
  ) { }

  computeXpToNext(level: number): number {
    if (!Number.isFinite(level) || level < 1) {
      level = 1;
    }
    // New formula: 1000 * (level ^ 1.5)
    return Math.floor(this.base * Math.pow(level, this.growth));
  }

  async getPlayerLevel(userId: string): Promise<PlayerLevelView> {
    const userObjectId = new Types.ObjectId(userId);

    let player = await this.playerLevelModel.findOne({ user: userObjectId }).exec();
    if (!player) {
      player = await this.playerLevelModel.create({
        user: userObjectId,
        level: 1,
        currentXP: 0,
        totalXP: 0,
      });
    }

    const xpToNextLevel = this.computeXpToNext(player.level);

    return {
      userId,
      level: player.level,
      currentXP: player.currentXP,
      totalXP: player.totalXP,
      xpToNextLevel,
    };
  }

  /**
   * Applies XP without multi-document transactions so standalone MongoDB (no replica set) works.
   * Idempotency: unique `eventId` on ProcessedXpEvent; insert first, rollback marker if save fails.
   */
  async addXP(
    userId: string,
    amount: number,
    source: XpEventType,
    eventId: string,
    metadata?: { payloadHash?: string },
  ): Promise<AddXpResult | null> {
    if (amount < 0) {
      throw new BadRequestException('XP amount must be >= 0');
    }

    const userObjectId = new Types.ObjectId(userId);

    try {
      await this.processedXpEventModel.create({
        eventId,
        user: userObjectId,
        type: source,
        payloadHash: metadata?.payloadHash,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return null;
      }
      throw error;
    }

    try {
      return await this.applyXpToPlayerDocument(userId, userObjectId, amount, source);
    } catch (err) {
      await this.processedXpEventModel.deleteOne({ eventId }).exec();
      throw err;
    }
  }

  private async applyXpToPlayerDocument(
    userId: string,
    userObjectId: Types.ObjectId,
    amount: number,
    source: XpEventType,
  ): Promise<AddXpResult> {
    let player = await this.playerLevelModel.findOne({ user: userObjectId }).exec();

    if (!player) {
      player = new this.playerLevelModel({
        user: userObjectId,
        level: 1,
        currentXP: 0,
        totalXP: 0,
      });
    }

    if (player.level < 1) {
      player.level = 1;
    }
    if (player.currentXP < 0) {
      player.currentXP = 0;
    }
    if (player.totalXP < 0) {
      player.totalXP = 0;
    }

    const oldLevel = player.level;

    let remainingXP = amount;
    let levelUpCount = 0;

    player.totalXP += remainingXP;

    while (remainingXP > 0) {
      const xpToNext = this.computeXpToNext(player.level);
      const xpMissingForLevel = xpToNext - player.currentXP;

      if (remainingXP >= xpMissingForLevel) {
        remainingXP -= xpMissingForLevel;
        player.level += 1;
        levelUpCount += 1;
        player.currentXP = 0;
      } else {
        player.currentXP += remainingXP;
        remainingXP = 0;
      }
    }

    player.updatedAt = new Date();

    await player.save();

    return {
      userId,
      source,
      levelUpCount,
      oldLevel,
      newLevel: player.level,
      addedXP: amount,
      newCurrentXP: player.currentXP,
      newTotalXP: player.totalXP,
    };
  }

  async applyEvent(event: XpEventBase): Promise<AddXpResult | null> {
    let amount = 0;

    if (event.type === 'MATCH_COMPLETED') {
      const payload = event.payload as MatchCompletedPayload;
      // New rewards per requirements:
      // Participation (Check-in) = 50 XP (usually handled by a specific event, but we'll adapt here)
      // Match Win = 100 XP
      const winBonus = payload.won ? 100 : 0;
      const participationXp = 50;

      amount = participationXp + winBonus;
    } else if (event.type === 'TOURNAMENT_WIN') {
      amount = 500;
    } else if (event.type === 'TOURNAMENT_PLACE_2') {
      amount = 300;
    } else if (event.type === 'TOURNAMENT_PLACE_3') {
      amount = 200;
    } else if (event.type === 'WIN_STREAK') {
      // +50 XP per stack, max 3 stacks handled by caller or we can check payload
      const stacks = (event.payload as any)?.stacks || 1;
      amount = Math.min(stacks, 3) * 50;
    } else if (event.type === 'MISSION_COMPLETED') {
      const payload = event.payload as MissionCompletedPayload;
      amount = Math.max(payload.reward ?? 0, 0);
    } else if (event.type === 'ACHIEVEMENT_UNLOCKED') {
      const payload = event.payload as AchievementUnlockedPayload;
      amount = Math.max(payload.reward ?? 0, 0);
    } else if (event.type === 'LOGIN_DAILY') {
      const payload = event.payload as DailyLoginPayload;
      if (!payload.hasDailyLoginSystem) {
        return null;
      }
      amount = 10;
    } else if (event.type === 'MANUAL') {
      if (typeof (event as any).payload?.amount === 'number') {
        amount = Math.max((event as any).payload.amount, 0);
      }
    } else {
      return null;
    }

    if (amount <= 0) {
      return null;
    }

    return this.addXP(
      event.userId,
      amount,
      event.type,
      event.id,
      { payloadHash: undefined },
    );
  }
}

