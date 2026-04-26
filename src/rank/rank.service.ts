import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePlayerRankDto } from './dto/create-rank.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { PlayerRank, PlayerRankDocument } from './schemas/rank.schema';
import { RankHistory, RankHistoryDocument, EloChangeReason } from './schemas/rank-history.schema';
import { Penalty, PenaltyDocument, PenaltyStatus } from './schemas/penalty.schema';
import { RankTierConfig, RankTierConfigDocument, TierName } from './schemas/rank-tier-config.schema';

const STARTING_ELO = 1000;
const K_FACTOR = 32;

const TIER_THRESHOLDS: { tier: TierName; minElo: number; maxElo: number; divisions: number }[] = [
  { tier: TierName.IRON, minElo: 0, maxElo: 499, divisions: 3 },
  { tier: TierName.BRONZE, minElo: 500, maxElo: 999, divisions: 3 },
  { tier: TierName.GOLD, minElo: 1000, maxElo: 1499, divisions: 3 },
  { tier: TierName.PLATINUM, minElo: 1500, maxElo: 1999, divisions: 3 },
  { tier: TierName.DIAMOND, minElo: 2000, maxElo: 2499, divisions: 3 },
  { tier: TierName.MASTER, minElo: 2500, maxElo: 2999, divisions: 2 },
  { tier: TierName.GRANDMASTER, minElo: 3000, maxElo: 3499, divisions: 2 },
  { tier: TierName.CHALLENGER, minElo: 3500, maxElo: Infinity, divisions: 1 },
];

export interface MatchParticipant {
  userId: Types.ObjectId;
  team: 'BLUE' | 'RED';
  elo: number;
}

export interface EloUpdateResult {
  userId: Types.ObjectId;
  previousElo: number;
  newElo: number;
  eloChange: number;
  didWin: boolean;
}

@Injectable()
export class RankService {
  constructor(
    @InjectModel(PlayerRank.name) private playerRankModel: Model<PlayerRankDocument>,
    @InjectModel(RankHistory.name) private rankHistoryModel: Model<RankHistoryDocument>,
    @InjectModel(Penalty.name) private penaltyModel: Model<PenaltyDocument>,
    @InjectModel(RankTierConfig.name) private rankTierConfigModel: Model<RankTierConfigDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────────────────
  // ELO FORMULA (K=32, standard Elo)
  // ──────────────────────────────────────────────────────────

  calculateNewElo(playerElo: number, opponentAvgElo: number, didWin: boolean): number {
    const expected = 1 / (1 + Math.pow(10, (opponentAvgElo - playerElo) / 400));
    const score = didWin ? 1 : 0;
    return Math.max(0, Math.round(playerElo + K_FACTOR * (score - expected)));
  }

  // ──────────────────────────────────────────────────────────
  // CORE: Process a completed match — the SINGLE path for elo updates
  // ──────────────────────────────────────────────────────────

  async processMatchCompletion(
    catalogId: Types.ObjectId,
    participants: MatchParticipant[],
    winningTeam: 'BLUE' | 'RED',
    gameId: string,
  ): Promise<EloUpdateResult[]> {
    const blueTeam = participants.filter(p => p.team === 'BLUE');
    const redTeam = participants.filter(p => p.team === 'RED');

    if (blueTeam.length === 0 || redTeam.length === 0) {
      throw new BadRequestException('Both teams must have at least one player');
    }

    const blueAvgElo = blueTeam.reduce((sum, p) => sum + p.elo, 0) / blueTeam.length;
    const redAvgElo = redTeam.reduce((sum, p) => sum + p.elo, 0) / redTeam.length;

    const results: EloUpdateResult[] = [];

    for (const participant of participants) {
      const didWin = participant.team === winningTeam;
      const opponentAvgElo = participant.team === 'BLUE' ? redAvgElo : blueAvgElo;
      const previousElo = participant.elo;
      const newElo = this.calculateNewElo(previousElo, opponentAvgElo, didWin);
      const eloChange = newElo - previousElo;

      const rank = await this.getOrCreateRank(participant.userId.toString(), catalogId.toString());

      const previousTier = rank.tier;
      const previousLevel = rank.level;

      rank.elo = newElo;
      rank.totalMatches += 1;
      rank.lastMatchDate = new Date();

      if (didWin) {
        rank.wins += 1;
        rank.currentStreak = Math.max(0, rank.currentStreak) + 1;
        rank.longestWinStreak = Math.max(rank.longestWinStreak, rank.currentStreak);
      } else {
        rank.losses += 1;
        rank.currentStreak = Math.min(0, rank.currentStreak) - 1;
      }

      if (rank.totalMatches > 0) {
        rank.winRate = Math.round((rank.wins / rank.totalMatches) * 100);
      }

      const { tier, division, level } = this.calculateTierAndLevel(newElo);
      rank.tier = tier;
      rank.division = division;
      rank.level = level;

      if (newElo > rank.peakElo) {
        rank.peakElo = newElo;
        rank.peakTier = tier;
        rank.peakDivision = division;
      }

      await rank.save();

      const isTierPromotion = this.isTierHigher(tier, previousTier);
      const isTierDemotion = this.isTierLower(tier, previousTier);

      await this.rankHistoryModel.create({
        playerRank: rank._id,
        user: participant.userId,
        game: catalogId,
        previousElo,
        newElo,
        eloChange,
        reason: didWin ? EloChangeReason.WIN : EloChangeReason.LOSS,
        reasonDetails: `Matchmaking ${didWin ? 'win' : 'loss'}`,
        match: Types.ObjectId.isValid(gameId) ? new Types.ObjectId(gameId) : undefined,
        previousTier,
        newTier: tier,
        previousLevel,
        newLevel: level,
        isTierPromotion,
        isTierDemotion,
      });

      this.eventEmitter.emit('match.completed', {
        matchId: gameId,
        userId: participant.userId.toString(),
        mode: 'RANKED',
        won: didWin,
      });

      results.push({ userId: participant.userId, previousElo, newElo, eloChange, didWin });
    }

    return results;
  }

  // ──────────────────────────────────────────────────────────
  // GET OR CREATE — ensures every player has a rank record
  // ──────────────────────────────────────────────────────────

  async getOrCreateRank(userId: string, gameId: string): Promise<PlayerRankDocument> {
    let rank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });

    if (!rank) {
      const { tier, division, level } = this.calculateTierAndLevel(STARTING_ELO);
      rank = await this.playerRankModel.create({
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
    }

    return rank;
  }

  async getPlayerElo(userId: string, gameId: string): Promise<number> {
    const rank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });
    return rank?.elo ?? STARTING_ELO;
  }

  // ──────────────────────────────────────────────────────────
  // READS (unchanged from before, kept for leaderboard / profile)
  // ──────────────────────────────────────────────────────────

  async initializePlayerRank(createPlayerRankDto: CreatePlayerRankDto) {
    const { userId, gameId } = createPlayerRankDto;

    const existingRank = await this.playerRankModel.findOne({
      user: new Types.ObjectId(userId),
      game: new Types.ObjectId(gameId),
    });

    if (existingRank) {
      throw new BadRequestException('Player rank already exists for this game');
    }

    const { tier, division, level } = this.calculateTierAndLevel(STARTING_ELO);

    return this.playerRankModel.create({
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
  }

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

  async getRankHistory(userId: string, gameId: string, limit: number = 50) {
    return this.rankHistoryModel
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
  }

  async getLeaderboard(gameId: string, season?: number, limit: number = 100) {
    if (!Types.ObjectId.isValid(gameId)) {
      return [];
    }

    const query: any = { game: new Types.ObjectId(gameId) };
    if (season) query.season = season;

    return this.playerRankModel
      .find(query)
      .sort({ elo: -1 })
      .limit(limit)
      .populate('user', 'nickname email region country avatar')
      .populate('game', 'title')
      .exec();
  }

  async getUserRanks(userId: string) {
    return this.playerRankModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('game', 'title genre coverImageUrl')
      .sort({ elo: -1 })
      .exec();
  }

  // ──────────────────────────────────────────────────────────
  // PENALTIES (kept for admin tooling)
  // ──────────────────────────────────────────────────────────

  async applyPenalty(applyPenaltyDto: ApplyPenaltyDto, issuedBy: string) {
    const { userId, gameId, type, severity, eloDeduction, notes, evidence, matchId, tournamentId, expiresAt, includesRankReset } = applyPenaltyDto;

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

    if (includesRankReset) {
      playerRank.elo = STARTING_ELO;
      const reset = this.calculateTierAndLevel(STARTING_ELO);
      playerRank.tier = reset.tier;
      playerRank.division = reset.division;
      playerRank.level = reset.level;
      playerRank.wins = 0;
      playerRank.losses = 0;
      playerRank.totalMatches = 0;
      playerRank.winRate = 0;
      playerRank.currentStreak = 0;
    } else {
      const newElo = Math.max(0, previousElo - eloDeduction);
      playerRank.elo = newElo;
      const { tier, division, level } = this.calculateTierAndLevel(newElo);
      playerRank.tier = tier;
      playerRank.division = division;
      playerRank.level = level;
    }

    await playerRank.save();

    const isTierDemotion = this.isTierLower(playerRank.tier, previousTier);

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

  // ──────────────────────────────────────────────────────────
  // SEASON RESET
  // ──────────────────────────────────────────────────────────

  async resetSeasonRanks(gameId: string, newSeason: number) {
    const ranks = await this.playerRankModel.find({
      game: new Types.ObjectId(gameId),
    });

    for (const rank of ranks) {
      const previousElo = rank.elo;
      const resetElo = Math.max(STARTING_ELO, Math.floor(rank.elo * 0.5 + STARTING_ELO * 0.5));
      const { tier, division, level } = this.calculateTierAndLevel(resetElo);

      const previousTier = rank.tier;
      const previousLevel = rank.level;

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

      await this.rankHistoryModel.create({
        playerRank: rank._id,
        user: rank.user,
        game: rank.game,
        previousElo,
        newElo: resetElo,
        eloChange: resetElo - previousElo,
        reason: EloChangeReason.SEASON_RESET,
        reasonDetails: `Season ${newSeason} reset`,
        previousTier,
        newTier: tier,
        previousLevel,
        newLevel: level,
        isTierPromotion: false,
        isTierDemotion: this.isTierLower(tier, previousTier),
      });
    }

    return { message: `Reset ${ranks.length} ranks for season ${newSeason}` };
  }

  // ──────────────────────────────────────────────────────────
  // PENALTIES READ
  // ──────────────────────────────────────────────────────────

  async getUserPenalties(userId: string, gameId?: string) {
    const query: any = { user: new Types.ObjectId(userId) };
    if (gameId) query.game = new Types.ObjectId(gameId);

    return this.penaltyModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('issuedBy', 'nickname')
      .populate('game', 'title')
      .exec();
  }

  // ──────────────────────────────────────────────────────────
  // TIER CALCULATION
  // ──────────────────────────────────────────────────────────

  calculateTierAndLevel(elo: number): { tier: TierName; division: number; level: number } {
    let cumulativeLevel = 1;

    for (const threshold of TIER_THRESHOLDS) {
      if (elo >= threshold.minElo && elo <= threshold.maxElo) {
        const eloRange = threshold.maxElo === Infinity ? 500 : threshold.maxElo - threshold.minElo;
        const eloInTier = elo - threshold.minElo;
        const divisionSize = eloRange / threshold.divisions;

        let division = Math.floor(eloInTier / divisionSize) + 1;
        division = Math.min(division, threshold.divisions);

        const level = cumulativeLevel + (division - 1);

        return {
          tier: threshold.tier,
          division: threshold.divisions - division + 1,
          level,
        };
      }

      cumulativeLevel += threshold.divisions;
    }

    return { tier: TierName.CHALLENGER, division: 1, level: cumulativeLevel };
  }

  private isTierHigher(tierA: string, tierB: string): boolean {
    const tierOrder = Object.values(TierName);
    return tierOrder.indexOf(tierA as TierName) > tierOrder.indexOf(tierB as TierName);
  }

  private isTierLower(tierA: string, tierB: string): boolean {
    const tierOrder = Object.values(TierName);
    return tierOrder.indexOf(tierA as TierName) < tierOrder.indexOf(tierB as TierName);
  }
}
