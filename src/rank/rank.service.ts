import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePlayerRankDto } from './dto/create-rank.dto';
import { UpdateEloDto, MatchResult } from './dto/update-elo.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { PlayerRank, PlayerRankDocument } from './schemas/rank.schema';
import { RankHistory, RankHistoryDocument, EloChangeReason } from './schemas/rank-history.schema';
import { Penalty, PenaltyDocument, PenaltyStatus } from './schemas/penalty.schema';
import { RankTierConfig, RankTierConfigDocument, TierName } from './schemas/rank-tier-config.schema';
import { RankGeneralConfig, RankGeneralConfigDocument } from './schemas/rank-general-config.schema';

@Injectable()
export class RankService {
  constructor(
    @InjectModel(PlayerRank.name) private playerRankModel: Model<PlayerRankDocument>,
    @InjectModel(RankHistory.name) private rankHistoryModel: Model<RankHistoryDocument>,
    @InjectModel(Penalty.name) private penaltyModel: Model<PenaltyDocument>,
    @InjectModel(RankTierConfig.name) private rankTierConfigModel: Model<RankTierConfigDocument>,
    @InjectModel(RankGeneralConfig.name) private rankGeneralConfigModel: Model<RankGeneralConfigDocument>,
    private eventEmitter: EventEmitter2,
  ) { }

  /**
   * Get general ranking configuration
   */
  async getGeneralConfig(gameId?: string): Promise<RankGeneralConfig> {
    const filter: any = gameId ? { game: new Types.ObjectId(gameId) } : { game: null };
    let config = await this.rankGeneralConfigModel.findOne(filter).exec();

    if (!config && gameId) {
      // Fallback to global config if game specific not found
      config = await this.rankGeneralConfigModel.findOne({ game: null }).exec();
    }

    if (!config) {
      // Default initial config if none exists in DB
      return {
        eloWinAmount: 400,
        eloLossAmount: 400,
        startingElo: 0,
        isActive: true
      } as RankGeneralConfig;
    }

    return config;
  }

  /**
   * Update general ranking configuration (Admin only)
   */
  async updateGeneralConfig(configData: Partial<RankGeneralConfig>, gameId?: string): Promise<RankGeneralConfig> {
    const filter: any = gameId ? { game: new Types.ObjectId(gameId) } : { game: null };
    let config = await this.rankGeneralConfigModel.findOneAndUpdate(
      filter,
      { ...configData, game: gameId ? new Types.ObjectId(gameId) : null },
      { new: true, upsert: true }
    ).exec();

    return config;
  }

  /**
   * Get all tier configurations
   */
  async getTierConfigs(gameId?: string): Promise<RankTierConfig[]> {
    const filter: any = gameId ? { game: new Types.ObjectId(gameId) } : { game: null };
    const configs = await this.rankTierConfigModel.find(filter).sort({ displayOrder: 1 }).exec();
    
    if (configs.length === 0 && gameId) {
        return this.rankTierConfigModel.find({ game: null }).sort({ displayOrder: 1 }).exec();
    }
    
    return configs;
  }

  /**
   * Update a tier configuration
   */
  async updateTierConfig(tier: TierName, data: Partial<RankTierConfig>, gameId?: string): Promise<RankTierConfig> {
    const filter: any = gameId ? { game: new Types.ObjectId(gameId), tier } : { game: null, tier };
    return this.rankTierConfigModel.findOneAndUpdate(
        filter,
        { ...data, tier, game: gameId ? new Types.ObjectId(gameId) : null },
        { new: true, upsert: true }
    ).exec();
  }

  /**
   * Initialize a new player rank for a specific game
   */
  async initializePlayerRank(createPlayerRankDto: CreatePlayerRankDto) {
    const { userId, gameId } = createPlayerRankDto;
    const config = await this.getGeneralConfig(gameId);

    // Check if rank already exists
    const existingRank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });

    if (existingRank) {
      throw new BadRequestException('Player rank already exists for this game');
    }

    const { tier, division, level } = await this.calculateTierAndLevel(config.startingElo, gameId);

    const newRank = await this.playerRankModel.create({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
      elo: config.startingElo,
      level,
      tier,
      division,
      peakElo: config.startingElo,
      peakTier: tier,
      peakDivision: division,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalMatches: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      season: 1,
    });

    return newRank;
  }

  /**
   * Get player rank for a specific game
   */
  async getPlayerRank(userId: string, gameId: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(gameId)) {
        throw new BadRequestException('Invalid User ID or Game ID format');
    }
    const rank = await this.playerRankModel
      .findOne({
        user: new Types.ObjectId(userId),
        game: new Types.ObjectId(gameId),
      })
      .populate('user', 'nickname email')
      .populate('game', 'title genre')
      .exec();

    if (!rank) {
      throw new NotFoundException('Player rank not found');
    }

    return rank;
  }

  /**
   * Update ELO after a match result
   */
  async updateElo(updateEloDto: UpdateEloDto, adminId?: string) {
    const { userId, gameId, result, matchId, tournamentId, reasonDetails } = updateEloDto;
    const config = await this.getGeneralConfig(gameId);

    // Get or create player rank
    let playerRank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });

    if (!playerRank) {
      // Auto-initialize if doesn't exist
      playerRank = await this.initializePlayerRank({ userId, gameId });
    }

    const previousElo = playerRank.elo;
    const previousTier = playerRank.tier;
    const previousLevel = playerRank.level;

    let eloChange = 0;
    let reason: EloChangeReason;

    if (result === MatchResult.WIN) {
      eloChange = config.eloWinAmount;
      reason = EloChangeReason.WIN;
      playerRank.wins += 1;
      playerRank.currentStreak = Math.max(0, playerRank.currentStreak) + 1;
      playerRank.longestWinStreak = Math.max(playerRank.longestWinStreak, playerRank.currentStreak);
    } else {
      eloChange = -config.eloLossAmount;
      reason = EloChangeReason.LOSS;
      playerRank.losses += 1;
      playerRank.currentStreak = Math.min(0, playerRank.currentStreak) - 1;
    }

    const newElo = Math.max(0, previousElo + eloChange); // Prevent negative ELO
    playerRank.elo = newElo;
    playerRank.totalMatches += 1;
    playerRank.lastMatchDate = new Date();

    // Calculate win rate
    if (playerRank.totalMatches > 0) {
      playerRank.winRate = Math.round((playerRank.wins / playerRank.totalMatches) * 100);
    }

    // Update tier and level
    const { tier, division, level } = await this.calculateTierAndLevel(newElo, gameId);
    playerRank.tier = tier;
    playerRank.division = division;
    playerRank.level = level;

    // Update peak if new ELO is higher
    if (newElo > playerRank.peakElo) {
      playerRank.peakElo = newElo;
      playerRank.peakTier = tier;
      playerRank.peakDivision = division;
    }

    await playerRank.save();

    // Record in history
    const isTierPromotion = this.isTierHigher(tier, previousTier);
    const isTierDemotion = this.isTierLower(tier, previousTier);

    await this.rankHistoryModel.create({
      playerRank: playerRank._id,
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
      previousElo,
      newElo,
      eloChange,
      reason,
      reasonDetails: reasonDetails || `Match ${result.toLowerCase()}`,
      match: matchId ? new Types.ObjectId(matchId) : undefined,
      tournament: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
      previousTier,
      newTier: tier,
      previousLevel,
      newLevel: level,
      isTierDemotion,
    });

    // Emit event for LEVEL/XP system
    this.eventEmitter.emit('match.completed', {
      matchId: matchId || `rank_update_${Date.now()}`,
      userId,
      mode: 'RANKED',
      won: result === MatchResult.WIN,
    });

    return playerRank;
  }

  /**
   * Apply a penalty to a player (Admin)
   */
  async applyPenalty(applyPenaltyDto: ApplyPenaltyDto, issuedBy: string) {
    const { userId, gameId, type, severity, eloDeduction, notes, evidence, matchId, tournamentId, expiresAt, includesRankReset } = applyPenaltyDto;
    const config = await this.getGeneralConfig(gameId);

    // Get player rank
    const playerRank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });

    if (!playerRank) {
      throw new NotFoundException('Player rank not found');
    }

    const previousElo = playerRank.elo;
    const previousTier = playerRank.tier;
    const previousLevel = playerRank.level;

    // Create penalty record
    const penalty = await this.penaltyModel.create({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
      type,
      severity,
      eloDeducted: eloDeduction,
      issuedBy: new Types.ObjectId(issuedBy),
      notes: notes || '',
      evidence: evidence || [],
      status: PenaltyStatus.ACTIVE,
      match: matchId ? new Types.ObjectId(matchId) : undefined,
      tournament: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
      expiresAt,
      includesRankReset: includesRankReset || false,
    });

    // Apply ELO deduction
    const newElo = Math.max(0, previousElo - eloDeduction);
    playerRank.elo = newElo;

    // Recalculate tier and level
    const { tier, division, level } = await this.calculateTierAndLevel(newElo, gameId);
    playerRank.tier = tier;
    playerRank.division = division;
    playerRank.level = level;

    // If includes rank reset, reset to starting values
    if (includesRankReset) {
      playerRank.elo = config.startingElo;
      playerRank.tier = TierName.IRON;
      playerRank.division = 1;
      playerRank.level = 1;
      playerRank.wins = 0;
      playerRank.losses = 0;
      playerRank.totalMatches = 0;
      playerRank.winRate = 0;
      playerRank.currentStreak = 0;
    }

    await playerRank.save();

    // Record in history
    const isTierDemotion = this.isTierLower(tier, previousTier);

    await this.rankHistoryModel.create({
      playerRank: playerRank._id,
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
      previousElo,
      newElo: playerRank.elo,
      eloChange: includesRankReset ? -previousElo : -eloDeduction,
      reason: EloChangeReason.PENALTY,
      reasonDetails: `Penalty: ${type} (${severity})`,
      penalty: penalty._id,
      previousTier,
      newTier: playerRank.tier,
      previousLevel,
      newLevel: level,
      isTierPromotion: false,
      isTierDemotion,
    });

    return { penalty, updatedRank: playerRank };
  }

  /**
   * Get rank history for a player
   */
  async getRankHistory(userId: string, gameId: string, limit: number = 50) {
    const history = await this.rankHistoryModel
      .find({
        user: new Types.ObjectId(userId),
        game: new Types.ObjectId(gameId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('match')
      .populate('tournament')
      .populate('penalty')
      .exec();

    return history;
  }

  /**
   * Get leaderboard for a game
   */
  async getLeaderboard(gameId: string, season?: number, limit: number = 100) {
    if (!Types.ObjectId.isValid(gameId)) {
      return [];
    }

    const query: any = {
      game: new Types.ObjectId(gameId),
    };

    if (season) {
      query.season = season;
    }

    return this.playerRankModel
      .find(query)
      .sort({ elo: -1 })
      .limit(limit)
      .populate('user', 'nickname email region country avatar')
      .populate('game', 'title')
      .exec();
  }

  /**
   * Get all ranks for a user across all games
   */
  async getUserRanks(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
        return []; // Return empty if invalid ID instead of crashing
    }
    const ranks = await this.playerRankModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('game', 'title genre coverImageUrl')
      .sort({ elo: -1 })
      .exec();

    return ranks;
  }

  /**
   * Reset season ranks
   */
  async resetSeasonRanks(gameId: string, newSeason: number) {
    const config = await this.getGeneralConfig(gameId);
    const ranks = await this.playerRankModel.find({
      game: new Types.ObjectId(gameId),
    });

    for (const rank of ranks) {
      // Soft reset - retain partial ELO
      const resetElo = Math.floor(rank.elo * 0.5); // Keep 50% of current ELO
      const { tier, division, level } = await this.calculateTierAndLevel(resetElo, gameId);

      const previousElo = rank.elo;
      rank.elo = resetElo;
      rank.tier = tier;
      rank.division = division;
      rank.level = level;
      rank.season = newSeason;
      rank.wins = 0;
      rank.losses = 0;
      rank.totalMatches = 0;
      rank.winRate = 0;
      rank.currentStreak = 0;

      await rank.save();

      // Record season reset in history
      await this.rankHistoryModel.create({
        playerRank: rank._id,
        user: rank.user,
        game: rank.game,
        previousElo,
        newElo: resetElo,
        eloChange: resetElo - previousElo,
        reason: EloChangeReason.SEASON_RESET,
        reasonDetails: `Season ${newSeason} reset`,
        previousTier: rank.tier,
        newTier: tier,
        previousLevel: rank.level,
        newLevel: level,
        isTierPromotion: false,
        isTierDemotion: true,
      });
    }

    return { message: `Reset ${ranks.length} ranks for season ${newSeason}` };
  }

  /**
   * Calculate tier, division, and level from ELO using dynamic tier configs
   */
  private async calculateTierAndLevel(elo: number, gameId?: string): Promise<{ tier: TierName; division: number; level: number }> {
    const tierConfigs = await this.getTierConfigs(gameId);
    
    // Sort tier configurations by display order to ensure consistent level calculation
    const sortedConfigs = tierConfigs.sort((a, b) => a.displayOrder - b.displayOrder);
    
    let cumulativeLevel = 1;

    for (const threshold of sortedConfigs) {
      const minElo = threshold.minElo;
      const maxElo = threshold.maxElo || Infinity;

      if (elo >= minElo && elo <= maxElo) {
        const eloRange = maxElo === Infinity ? 1000 : (maxElo - minElo);
        const eloInTier = elo - minElo;
        const divisionSize = eloRange / threshold.divisions;

        // Calculate division
        let division = Math.floor(eloInTier / divisionSize) + 1;
        division = Math.min(division, threshold.divisions);

        const level = cumulativeLevel + (division - 1);

        return {
          tier: threshold.tier,
          division: threshold.divisions - division + 1, // higher elo = division 1 (or max) depending on logic.
          // Usually Division 1 is higher than Division 3.
          level,
        };
      }

      cumulativeLevel += threshold.divisions;
    }

    // Default to first tier if elo is too low and no tier matches (safety)
    if (sortedConfigs.length > 0) {
        return {
          tier: sortedConfigs[0].tier,
          division: sortedConfigs[0].divisions,
          level: 1,
        };
    }

    // Absolute fallback
    return {
      tier: TierName.IRON,
      division: 1,
      level: 1,
    };
  }

  private isTierHigher(tierA: string, tierB: string): boolean {
    const tierOrder = Object.values(TierName);
    return tierOrder.indexOf(tierA as TierName) > tierOrder.indexOf(tierB as TierName);
  }

  private isTierLower(tierA: string, tierB: string): boolean {
    const tierOrder = Object.values(TierName);
    return tierOrder.indexOf(tierA as TierName) < tierOrder.indexOf(tierB as TierName);
  }

  async getUserPenalties(userId: string, gameId?: string) {
    const query: any = { user: new Types.ObjectId(userId) };
    if (gameId) {
      query.game = new Types.ObjectId(gameId);
    }

    const penalties = await this.penaltyModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('issuedBy', 'nickname')
      .populate('game', 'title')
      .exec();

    return penalties;
  }
}
