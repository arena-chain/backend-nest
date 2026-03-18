import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScoutingReport, ScoutingReportDocument } from './schemas/scouting-report.schema';
import { PlayerProspectStatus, PlayerProspectStatusDocument, ProspectLevel, ProspectPriority } from './schemas/player-prospect-status.schema';
import { PlayerRecommendation, PlayerRecommendationDocument, RecommendationStatus } from './schemas/player-recommendation.schema';
import { Watchlist, WatchlistDocument } from './schemas/watchlist.schema';
import { CreateScoutingReportDto } from './dto/create-scouting-report.dto';
import { CreatePlayerProspectStatusDto } from './dto/create-player-prospect-status.dto';
import { CreatePlayerRecommendationDto } from './dto/create-player-recommendation.dto';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateScoutingReportDto } from './dto/update-scouting-report.dto';
import { UpdatePlayerProspectStatusDto } from './dto/update-player-prospect-status.dto';
import { UpdatePlayerRecommendationDto } from './dto/update-player-recommendation.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { PlayerService } from '../player/player.service';
import { RankService } from '../rank/rank.service';
import { SeasonRoster } from '../season-roster/schemas/season-roster.schema';

@Injectable()
export class ScoutingService {
  constructor(
    @InjectModel(ScoutingReport.name) private reportModel: Model<ScoutingReportDocument>,
    @InjectModel(PlayerProspectStatus.name) private prospectModel: Model<PlayerProspectStatusDocument>,
    @InjectModel(PlayerRecommendation.name) private recommendationModel: Model<PlayerRecommendationDocument>,
    @InjectModel(Watchlist.name) private watchlistModel: Model<WatchlistDocument>,
    @InjectModel(SeasonRoster.name) private rosterModel: Model<any>,
    private readonly playerService: PlayerService,
    private readonly rankService: RankService,
  ) {}

  // ─── ScoutingReport ────────────────────────────────────────────────────────

  async createReport(dto: CreateScoutingReportDto, scouterId: string): Promise<ScoutingReport> {
    const report = new this.reportModel({
      scouterId: new Types.ObjectId(scouterId),
      playerId: new Types.ObjectId(dto.playerId),
      matchId: dto.matchId ? new Types.ObjectId(dto.matchId) : undefined,
      rating: dto.rating,
      strengths: dto.strengths ?? '',
      weaknesses: dto.weaknesses ?? '',
      notes: dto.notes ?? '',
      recommendedRole: dto.recommendedRole ?? '',
    });
    return report.save();
  }

  async findReportsByScouter(scouterId: string, playerId?: string): Promise<ScoutingReport[]> {
    const filter: any = { scouterId: new Types.ObjectId(scouterId) };
    if (playerId) filter.playerId = new Types.ObjectId(playerId);
    return this.reportModel
      .find(filter)
      .populate('playerId', 'nickname email country')
      .populate('matchId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findReportsByPlayer(playerId: string): Promise<ScoutingReport[]> {
    return this.reportModel
      .find({ playerId: new Types.ObjectId(playerId) })
      .populate('scouterId', 'nickname email')
      .populate('matchId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findReportById(id: string): Promise<ScoutingReport> {
    const r = await this.reportModel
      .findById(id)
      .populate('playerId', 'nickname email country')
      .populate('scouterId', 'nickname email')
      .populate('matchId')
      .exec();
    if (!r) throw new NotFoundException(`Scouting report ${id} not found`);
    return r;
  }

  async updateReport(id: string, dto: UpdateScoutingReportDto): Promise<ScoutingReport> {
    const updated = await this.reportModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Scouting report ${id} not found`);
    return updated;
  }

  async deleteReport(id: string): Promise<void> {
    const deleted = await this.reportModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Scouting report ${id} not found`);
  }

  // ─── PlayerProspectStatus ────────────────────────────────────────────────────

  async createOrUpdateProspectStatus(dto: CreatePlayerProspectStatusDto): Promise<PlayerProspectStatus> {
    const existing = await this.prospectModel.findOne({ playerId: new Types.ObjectId(dto.playerId) }).exec();
    if (existing) {
      existing.prospectLevel = dto.prospectLevel ?? existing.prospectLevel;
      existing.priority = dto.priority ?? existing.priority;
      existing.lastUpdated = new Date();
      return existing.save();
    }
    const status = new this.prospectModel({
      playerId: new Types.ObjectId(dto.playerId),
      prospectLevel: dto.prospectLevel ?? ProspectLevel.UNKNOWN,
      priority: dto.priority ?? ProspectPriority.LOW,
      lastUpdated: new Date(),
    });
    return status.save();
  }

  async findProspectStatusByPlayer(playerId: string): Promise<PlayerProspectStatus | null> {
    return this.prospectModel.findOne({ playerId: new Types.ObjectId(playerId) }).exec();
  }

  async findProspectsByLevel(prospectLevel?: ProspectLevel, priority?: ProspectPriority): Promise<PlayerProspectStatus[]> {
    const filter: any = {};
    if (prospectLevel) filter.prospectLevel = prospectLevel;
    if (priority) filter.priority = priority;
    return this.prospectModel
      .find(filter)
      .populate('playerId', 'nickname email country')
      .sort({ lastUpdated: -1 })
      .exec();
  }

  async updateProspectStatus(playerId: string, dto: UpdatePlayerProspectStatusDto): Promise<PlayerProspectStatus> {
    const updated = await this.prospectModel
      .findOneAndUpdate(
        { playerId: new Types.ObjectId(playerId) },
        { ...dto, lastUpdated: new Date() },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Prospect status for player ${playerId} not found`);
    return updated;
  }

  // ─── PlayerRecommendation ───────────────────────────────────────────────────

  async createRecommendation(dto: CreatePlayerRecommendationDto, scouterId: string): Promise<PlayerRecommendation> {
    const rec = new this.recommendationModel({
      scouterId: new Types.ObjectId(scouterId),
      playerId: new Types.ObjectId(dto.playerId),
      organizationId: new Types.ObjectId(dto.organizationId),
      recommendationLevel: dto.recommendationLevel,
      message: dto.message ?? '',
      status: RecommendationStatus.PENDING,
    });
    return rec.save();
  }

  async findRecommendationsByScouter(scouterId: string): Promise<PlayerRecommendation[]> {
    return this.recommendationModel
      .find({ scouterId: new Types.ObjectId(scouterId) })
      .populate('playerId', 'nickname email country')
      .populate('organizationId', 'name tag logo')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findRecommendationsByPlayer(playerId: string): Promise<PlayerRecommendation[]> {
    return this.recommendationModel
      .find({ playerId: new Types.ObjectId(playerId) })
      .populate('scouterId', 'nickname email')
      .populate('organizationId', 'name tag logo')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findRecommendationsByOrganization(organizationId: string, status?: RecommendationStatus): Promise<PlayerRecommendation[]> {
    const filter: any = { organizationId: new Types.ObjectId(organizationId) };
    if (status) filter.status = status;
    return this.recommendationModel
      .find(filter)
      .populate('playerId', 'nickname email country')
      .populate('scouterId', 'nickname email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateRecommendationStatus(id: string, status: RecommendationStatus): Promise<PlayerRecommendation> {
    const updated = await this.recommendationModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('playerId', 'nickname email country')
      .populate('organizationId', 'name tag logo')
      .exec();
    if (!updated) throw new NotFoundException(`Recommendation ${id} not found`);
    return updated;
  }

  // ─── Watchlist ─────────────────────────────────────────────────────────────

  async addToWatchlist(scouterId: string, dto: CreateWatchlistDto): Promise<Watchlist> {
    const existing = await this.watchlistModel
      .findOne({
        scouterId: new Types.ObjectId(scouterId),
        playerId: new Types.ObjectId(dto.playerId),
      })
      .exec();
    if (existing) {
      throw new ConflictException('Player is already in your watchlist');
    }
    const entry = new this.watchlistModel({
      scouterId: new Types.ObjectId(scouterId),
      playerId: new Types.ObjectId(dto.playerId),
      notes: dto.notes ?? '',
      priority: dto.priority ?? ProspectPriority.LOW,
    });
    const saved = await entry.save();
    const populated = await this.watchlistModel
      .findById(saved._id)
      .populate('playerId', 'nickname email country')
      .exec();
    return populated ?? saved;
  }

  async removeFromWatchlist(scouterId: string, playerId: string): Promise<void> {
    const deleted = await this.watchlistModel
      .findOneAndDelete({
        scouterId: new Types.ObjectId(scouterId),
        playerId: new Types.ObjectId(playerId),
      })
      .exec();
    if (!deleted) {
      throw new NotFoundException('Player not found in your watchlist');
    }
  }

  async getWatchlistByScouter(scouterId: string): Promise<Watchlist[]> {
    return this.watchlistModel
      .find({ scouterId: new Types.ObjectId(scouterId) })
      .populate('playerId', 'nickname email country')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getWatchlistByPlayer(playerId: string): Promise<Watchlist[]> {
    return this.watchlistModel
      .find({ playerId: new Types.ObjectId(playerId) })
      .populate('scouterId', 'nickname email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async isPlayerInWatchlist(scouterId: string, playerId: string): Promise<boolean> {
    const entry = await this.watchlistModel
      .findOne({
        scouterId: new Types.ObjectId(scouterId),
        playerId: new Types.ObjectId(playerId),
      })
      .exec();
    return !!entry;
  }

  async updateWatchlistEntry(id: string, scouterId: string, dto: UpdateWatchlistDto): Promise<Watchlist> {
    const updated = await this.watchlistModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), scouterId: new Types.ObjectId(scouterId) },
        dto,
        { new: true },
      )
      .populate('playerId', 'nickname email country')
      .exec();
    if (!updated) throw new NotFoundException('Watchlist entry not found');
    return updated;
  }

  // ─── Filtered players (rank, origin, hasTeam, prospect) ─────────────────────

  async getFilteredPlayers(filters: {
    gameId?: string;
    tier?: string;
    country?: string;
    hasTeam?: boolean;
    prospectLevel?: ProspectLevel;
    priority?: ProspectPriority;
  }): Promise<any[]> {
    const { gameId, tier, country, hasTeam, prospectLevel, priority } = filters;

    let playerIds: string[] | null = null;

    if (gameId) {
      const leaderboard = await this.rankService.getLeaderboard(gameId, undefined, 500);
      let ids = leaderboard.map((e: any) => (e.user?._id ?? e.user)?.toString()).filter(Boolean);
      if (tier) {
        ids = leaderboard
          .filter((e: any) => e.tier && String(e.tier).toUpperCase() === tier.toUpperCase())
          .map((e: any) => (e.user?._id ?? e.user)?.toString())
          .filter(Boolean);
      }
      playerIds = ids;
    }

    if (prospectLevel || priority) {
      const prospectFilter: any = {};
      if (prospectLevel) prospectFilter.prospectLevel = prospectLevel;
      if (priority) prospectFilter.priority = priority;
      const prospects = await this.prospectModel.find(prospectFilter).exec();
      const ids = prospects.map((p) => p.playerId.toString());
      playerIds = playerIds ? playerIds.filter((id) => ids.includes(id)) : ids;
    }

    let results = await this.playerService.findAll();

    if (playerIds && playerIds.length > 0) {
      const idSet = new Set(playerIds);
      results = results.filter((p: any) => {
        const uid = (p.userId?._id ?? p.userId)?.toString();
        return idSet.has(uid);
      });
    }

    if (country) {
      results = results.filter((p: any) => {
        const c = (p.userId as any)?.country ?? '';
        return c.toLowerCase().includes(country.toLowerCase());
      });
    }

    if (hasTeam !== undefined) {
      const rosterPlayerIds = new Set<string>();
      const rosters = await this.rosterModel.find({}).exec();
      for (const r of rosters) {
        for (const pid of r.playerIds || []) {
          rosterPlayerIds.add(pid.toString());
        }
      }
      results = results.filter((p: any) => {
        const uid = (p.userId?._id ?? p.userId)?.toString();
        const inRoster = rosterPlayerIds.has(uid);
        return hasTeam ? inRoster : !inRoster;
      });
    }

    return results;
  }
}
