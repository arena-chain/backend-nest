import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PlayerGameProfile,
  PlayerGameProfileDocument,
} from '../schemas/player-game-profile.schema';
import { Game, GameDocument } from '../../games/entities/game.entity';

export interface GameProfileStatsDto {
  userId: string;
  gameId: string;
  rank: string;
  rankDivision: number;
  rankPoints: number;
  elo: number;
  peakElo: number;
  xp: number;
  missionLevel: number;
  rankedWins: number;
  rankedLosses: number;
  customWins: number;
  customLosses: number;
  gamesPlayed: number;
  linkStatus: string;
  linkedAccountId?: string;
  lastPlayedAt?: Date;
}

@Injectable()
export class PlayerGameProfileService {
  private readonly logger = new Logger(PlayerGameProfileService.name);
  private readonly XP_PER_LEVEL = 1000;

  constructor(
    @InjectModel(PlayerGameProfile.name)
    private readonly playerGameProfileModel: Model<PlayerGameProfileDocument>,
    @InjectModel(Game.name)
    private readonly gameModel: Model<GameDocument>,
  ) {}

  async getOrCreateProfile(
    userId: string,
    gameId: string,
  ): Promise<PlayerGameProfileDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const gameObjectId = new Types.ObjectId(gameId);

    let profile = await this.playerGameProfileModel.findOne({
      userId: userObjectId,
      gameId: gameObjectId,
    });

    if (profile) return profile;

    profile = await this.playerGameProfileModel.create({
      userId: userObjectId,
      gameId: gameObjectId,
      rank: 'UNRANKED',
      rankDivision: 0,
      rankPoints: 0,
      elo: 1000,
      peakElo: 1000,
      xp: 0,
      missionLevel: 1,
      rankedWins: 0,
      rankedLosses: 0,
      customWins: 0,
      customLosses: 0,
      gamesPlayed: 0,
      linkStatus: 'UNLINKED',
      isActive: true,
    });

    this.logger.log(`Created profile: ${userId} for game ${gameId}`);
    return profile;
  }

  async updateElo(
    userId: string,
    gameId: string,
    eloChange: number,
    isWin: boolean,
  ): Promise<PlayerGameProfileDocument> {
    const profile = await this.getOrCreateProfile(userId, gameId);
    const newElo = Math.max(0, profile.elo + eloChange);

    profile.elo = newElo;
    if (newElo > profile.peakElo) profile.peakElo = newElo;
    if (isWin) profile.rankedWins += 1;
    else profile.rankedLosses += 1;
    profile.gamesPlayed += 1;
    profile.lastPlayedAt = new Date();

    await profile.save();
    const sign = eloChange >= 0 ? '+' : '';
    this.logger.log(
      `ELO updated: ${userId} | game=${gameId} | elo=${newElo} (${sign}${eloChange}) | ${isWin ? 'W' : 'L'}`,
    );
    return profile;
  }

  async updateCustomStats(
    userId: string,
    gameId: string,
    isWin: boolean,
  ): Promise<PlayerGameProfileDocument> {
    const profile = await this.getOrCreateProfile(userId, gameId);
    if (isWin) profile.customWins += 1;
    else profile.customLosses += 1;
    profile.gamesPlayed += 1;
    profile.lastPlayedAt = new Date();

    await profile.save();
    this.logger.log(
      `Custom stats updated: ${userId} | game=${gameId} | ${isWin ? 'W' : 'L'} | custom W/L: ${profile.customWins}/${profile.customLosses}`,
    );
    return profile;
  }

  async addXp(
    userId: string,
    gameId: string,
    xpAmount: number,
  ): Promise<PlayerGameProfileDocument> {
    const profile = await this.getOrCreateProfile(userId, gameId);
    const oldLevel = profile.missionLevel;
    profile.xp += xpAmount;
    profile.missionLevel = Math.floor(profile.xp / this.XP_PER_LEVEL) + 1;

    if (profile.missionLevel > oldLevel) {
      this.logger.log(
        `Mission level up: ${userId} | game=${gameId} | level ${oldLevel} -> ${profile.missionLevel}`,
      );
    }

    await profile.save();
    return profile;
  }

  async updateRankTier(
    userId: string,
    gameId: string,
    tier: string,
    division: number,
    points: number,
  ): Promise<PlayerGameProfileDocument> {
    const profile = await this.getOrCreateProfile(userId, gameId);
    profile.rank = tier;
    profile.rankDivision = division;
    profile.rankPoints = points;
    await profile.save();
    this.logger.log(
      `Rank tier updated: ${userId} | game=${gameId} | ${tier} [${division}] ${points}pts`,
    );
    return profile;
  }

  async updateLinkStatus(
    userId: string,
    gameId: string,
    status: 'UNLINKED' | 'PENDING' | 'VERIFIED',
    linkedAccountId?: string,
  ): Promise<PlayerGameProfileDocument> {
    const profile = await this.getOrCreateProfile(userId, gameId);
    profile.linkStatus = status;
    if (linkedAccountId) profile.linkedAccountId = linkedAccountId;
    await profile.save();
    this.logger.log(`Link status updated: ${userId} | game=${gameId} | ${status}`);
    return profile;
  }

  async getProfile(
    userId: string,
    gameId: string,
  ): Promise<GameProfileStatsDto | null> {
    const profile = await this.playerGameProfileModel.findOne({
      userId: new Types.ObjectId(userId),
      gameId: new Types.ObjectId(gameId),
    });
    return profile ? this.mapToDto(profile) : null;
  }

  async getUserAllProfiles(userId: string): Promise<GameProfileStatsDto[]> {
    const profiles = await this.playerGameProfileModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .sort({ lastPlayedAt: -1 });
    return profiles.map((p) => this.mapToDto(p));
  }

  async getLeaderboard(
    gameId: string,
    limit: number = 100,
  ): Promise<GameProfileStatsDto[]> {
    const profiles = await this.playerGameProfileModel
      .find({ gameId: new Types.ObjectId(gameId), isActive: true })
      .sort({ elo: -1 })
      .limit(limit);
    return profiles.map((p) => this.mapToDto(p));
  }

  async getUserRecentMatches(
    userId: string,
    gameId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const games = await this.gameModel
      .find({
        'participants.userId': new Types.ObjectId(userId),
        game_id: new Types.ObjectId(gameId),
        status: 'COMPLETED',
      })
      .sort({ finished_at: -1 })
      .limit(limit);
    return games.map((game) => this.mapMatchToDto(game, userId));
  }

  private mapMatchToDto(game: GameDocument, userId: string): any {
    const userParticipant = game.participants.find(
      (p) => p.userId.toString() === userId,
    );
    const didUserWin =
      !!userParticipant &&
      !!game.winningTeam &&
      game.winningTeam === userParticipant.team;
    const blue = game.participants.filter((p) => p.team === 'BLUE');
    const red = game.participants.filter((p) => p.team === 'RED');
    const duration = game.finished_at && game.started_at
      ? Math.floor(
          (new Date(game.finished_at).getTime() -
            new Date(game.started_at).getTime()) /
            60000,
        )
      : 0;

    return {
      gameId: game._id.toString(),
      mode: game.mode,
      result: didUserWin ? 'WIN' : 'LOSS',
      userTeam: userParticipant?.team ?? null,
      winningTeam: game.winningTeam,
      finishedAt: game.finished_at,
      duration,
      blueTeamSize: blue.length,
      redTeamSize: red.length,
      userElo: userParticipant?.elo || 1000,
    };
  }

  private mapToDto(profile: PlayerGameProfileDocument): GameProfileStatsDto {
    return {
      userId: profile.userId.toString(),
      gameId: profile.gameId.toString(),
      rank: profile.rank,
      rankDivision: profile.rankDivision,
      rankPoints: profile.rankPoints,
      elo: profile.elo,
      peakElo: profile.peakElo,
      xp: profile.xp,
      missionLevel: profile.missionLevel,
      rankedWins: profile.rankedWins,
      rankedLosses: profile.rankedLosses,
      customWins: profile.customWins,
      customLosses: profile.customLosses,
      gamesPlayed: profile.gamesPlayed,
      linkStatus: profile.linkStatus,
      linkedAccountId: profile.linkedAccountId,
      lastPlayedAt: profile.lastPlayedAt,
    };
  }
}
