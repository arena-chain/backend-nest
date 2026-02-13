import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePlayerRankDto } from './dto/create-rank.dto';
import { UpdateEloDto, MatchResult } from './dto/update-elo.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { PlayerRank, PlayerRankDocument } from './schemas/rank.schema';
import { RankHistory, RankHistoryDocument, EloChangeReason } from './schemas/rank-history.schema';
import { Penalty, PenaltyDocument, PenaltyStatus } from './schemas/penalty.schema';
import { RankTierConfig, RankTierConfigDocument, TierName } from './schemas/rank-tier-config.schema';

// ELO Configuration
const ELO_WIN_AMOUNT = 400;
const ELO_LOSS_AMOUNT = 400;
const STARTING_ELO = 0;

// Tier thresholds (ELO ranges)
const TIER_THRESHOLDS = [
  { tier: TierName.IRON, minElo: 0, maxElo: 999, divisions: 3 },
  { tier: TierName.BRONZE, minElo: 1000, maxElo: 1999, divisions: 3 },
  { tier: TierName.SILVER, minElo: 2000, maxElo: 2999, divisions: 3 },
  { tier: TierName.GOLD, minElo: 3000, maxElo: 3999, divisions: 3 },
  { tier: TierName.PLATINUM, minElo: 4000, maxElo: 4999, divisions: 3 },
  { tier: TierName.DIAMOND, minElo: 5000, maxElo: 5999, divisions: 3 },
  { tier: TierName.MASTER, minElo: 6000, maxElo: 6999, divisions: 2 },
  { tier: TierName.GRANDMASTER, minElo: 7000, maxElo: 7999, divisions: 2 },
  { tier: TierName.CHALLENGER, minElo: 8000, maxElo: Infinity, divisions: 1 },
];

@Injectable()
export class RankService {
  constructor(
    @InjectModel(PlayerRank.name) private playerRankModel: Model<PlayerRankDocument>,
    @InjectModel(RankHistory.name) private rankHistoryModel: Model<RankHistoryDocument>,
    @InjectModel(Penalty.name) private penaltyModel: Model<PenaltyDocument>,
    @InjectModel(RankTierConfig.name) private rankTierConfigModel: Model<RankTierConfigDocument>,
  ) { }

  /**
   * Initialize a new player rank for a specific game
   */
  async initializePlayerRank(createPlayerRankDto: CreatePlayerRankDto) {
    const { userId, gameId } = createPlayerRankDto;

    // Check if rank already exists
    const existingRank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });

    if (existingRank) {
      throw new BadRequestException('Player rank already exists for this game');
    }

    const { tier, division, level } = this.calculateTierAndLevel(STARTING_ELO);

    const newRank = await this.playerRankModel.create({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
      elo: STARTING_ELO,
      level,
      tier,
      division,
      peakElo: STARTING_ELO,
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
      eloChange = ELO_WIN_AMOUNT;
      reason = EloChangeReason.WIN;
      playerRank.wins += 1;
      playerRank.currentStreak = Math.max(0, playerRank.currentStreak) + 1;
      playerRank.longestWinStreak = Math.max(playerRank.longestWinStreak, playerRank.currentStreak);
    } else {
      eloChange = -ELO_LOSS_AMOUNT;
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
    const { tier, division, level } = this.calculateTierAndLevel(newElo);
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
      isTierPromotion,
      isTierDemotion,
    });

    return playerRank;
  }

  /**
   * Apply a penalty to a player
   */
  async applyPenalty(applyPenaltyDto: ApplyPenaltyDto, issuedBy: string) {
    const { userId, gameId, type, severity, eloDeduction, notes, evidence, matchId, tournamentId, expiresAt, includesRankReset } = applyPenaltyDto;

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
    const { tier, division, level } = this.calculateTierAndLevel(newElo);
    playerRank.tier = tier;
    playerRank.division = division;
    playerRank.level = level;

    // If includes rank reset, reset to starting values
    if (includesRankReset) {
      playerRank.elo = STARTING_ELO;
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
      newLevel: playerRank.level,
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
    const query: any = {
      game: new Types.ObjectId(gameId),
    };

    if (season) {
      query.season = season;
    }

    const leaderboard = await this.playerRankModel
      .find(query)
      .sort({ elo: -1 })
      .limit(limit)
      .populate('user', 'nickname email')
      .populate('game', 'title')
      .exec();

    return leaderboard;
  }

  /**
   * Get all ranks for a user across all games
   */
  async getUserRanks(userId: string) {
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
    const ranks = await this.playerRankModel.find({
      game: new Types.ObjectId(gameId),
    });

    for (const rank of ranks) {
      // Soft reset - retain partial ELO
      const resetElo = Math.floor(rank.elo * 0.5); // Keep 50% of current ELO
      const { tier, division, level } = this.calculateTierAndLevel(resetElo);

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
        previousElo: rank.elo * 2,
        newElo: resetElo,
        eloChange: -Math.floor(rank.elo),
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
   * Calculate tier, division, and level from ELO
   */
  private calculateTierAndLevel(elo: number): { tier: TierName; division: number; level: number } {
    let cumulativeLevel = 1;

    for (const threshold of TIER_THRESHOLDS) {
      if (elo >= threshold.minElo && elo <= threshold.maxElo) {
        const eloRange = threshold.maxElo - threshold.minElo;
        const eloInTier = elo - threshold.minElo;
        const divisionSize = eloRange / threshold.divisions;

        // Calculate division (1-based, descending - higher division = lower ELO within tier)
        let division = Math.floor(eloInTier / divisionSize) + 1;
        division = Math.min(division, threshold.divisions);

        // Calculate level for this tier
        const levelInTier = division;
        const level = cumulativeLevel + (levelInTier - 1);

        return {
          tier: threshold.tier,
          division: threshold.divisions - division + 1, // Invert so division 3 is highest
          level,
        };
      }

      cumulativeLevel += threshold.divisions;
    }

    // Default to highest tier if ELO exceeds all thresholds
    return {
      tier: TierName.CHALLENGER,
      division: 1,
      level: cumulativeLevel,
    };
  }

  /**
   * Check if tier A is higher than tier B
   */
  private isTierHigher(tierA: string, tierB: string): boolean {
    const tierOrder = Object.values(TierName);
    return tierOrder.indexOf(tierA as TierName) > tierOrder.indexOf(tierB as TierName);
  }

  /**
   * Check if tier A is lower than tier B
   */
  private isTierLower(tierA: string, tierB: string): boolean {
    const tierOrder = Object.values(TierName);
    return tierOrder.indexOf(tierA as TierName) < tierOrder.indexOf(tierB as TierName);
  }

  /**
   * Get penalty statistics for a user
   */
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
