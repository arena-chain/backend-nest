import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Interval } from '@nestjs/schedule';
import { Game, GameDocument } from '../games/entities/game.entity';
import {
  MatchmakingTicket,
  MatchmakingTicketDocument,
} from './schemas/matchmaking-ticket.schema';
import { PlayerRank, PlayerRankDocument } from '../rank/schemas/rank.schema';
import { Catalog, CatalogDocument } from '../catalog/schemas/catalog.entity';
import { RankService } from '../rank/rank.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { JoinQueueDto } from './dto/join-queue.dto';

// ──────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────

const MODES = [
  { mode: 'CUSTOM_1V1', requiredPlayers: 2 },
  { mode: 'CUSTOM_2V2', requiredPlayers: 4 },
  { mode: 'CUSTOM_5V5', requiredPlayers: 10 },
];

const INITIAL_ELO_RANGE = 50;
const EXPAND_PER_INTERVAL = 50;
const EXPAND_INTERVAL_MS = 30_000;
const MAX_ELO_RANGE = 500;

const GAME_ACCEPTANCE_TIMEOUT_S = 15;

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private catalogCache = new Map<string, Types.ObjectId>();

  constructor(
    @InjectModel(Game.name)
    private readonly gameModel: Model<GameDocument>,
    @InjectModel(MatchmakingTicket.name)
    private readonly ticketModel: Model<MatchmakingTicketDocument>,
    @InjectModel(PlayerRank.name)
    private readonly playerRankModel: Model<PlayerRankDocument>,
    @InjectModel(Catalog.name)
    private readonly catalogModel: Model<CatalogDocument>,
    private readonly rankService: RankService,
    @Inject(forwardRef(() => MatchmakingGateway))
    private readonly gateway: MatchmakingGateway,
  ) {}

  // ──────────────────────────────────────────────────────────
  // CATALOG RESOLUTION (with in-memory cache)
  // ──────────────────────────────────────────────────────────

  private async resolveCatalogId(
    gameKey: string,
  ): Promise<Types.ObjectId | null> {
    if (this.catalogCache.has(gameKey)) {
      return this.catalogCache.get(gameKey)!;
    }

    const patterns: Record<string, RegExp> = {
      LOL: /league of legends|lol/i,
      VALORANT: /valorant/i,
    };

    const regex = patterns[gameKey.toUpperCase()];
    if (!regex) return null;

    const catalog = await this.catalogModel
      .findOne({ title: { $regex: regex } })
      .exec();
    if (catalog) {
      this.catalogCache.set(gameKey, catalog._id);
      return catalog._id;
    }

    return null;
  }

  // ──────────────────────────────────────────────────────────
  // DYNAMIC ELO THRESHOLD
  // ──────────────────────────────────────────────────────────

  private calculateDynamicThreshold(ticketCreatedAt: Date): number {
    const waitMs = Date.now() - ticketCreatedAt.getTime();
    const expansions = Math.floor(waitMs / EXPAND_INTERVAL_MS);
    const range = Math.min(
      INITIAL_ELO_RANGE + expansions * EXPAND_PER_INTERVAL,
      MAX_ELO_RANGE,
    );
    return range * 2;
  }

  // ──────────────────────────────────────────────────────────
  // JOIN QUEUE
  // ──────────────────────────────────────────────────────────

  async joinQueue(userId: string, dto: JoinQueueDto) {
    const isScheduled = !!dto.scheduledAt;

    if (!isScheduled) {
      await this.ticketModel.updateMany(
        { userId: new Types.ObjectId(userId), status: 'MATCHED' },
        { $set: { status: 'CANCELLED' } },
      );

      await this.gameModel.updateMany(
        {
          'participants.userId': new Types.ObjectId(userId),
          status: 'PENDING_ACCEPTANCE',
          match_type: 'MATCHMAKING',
        },
        { $set: { status: 'CANCELLED' } },
      );

      const existingSearch = await this.ticketModel.findOne({
        userId: new Types.ObjectId(userId),
        status: 'SEARCHING',
      });
      if (existingSearch) {
        return existingSearch;
      }
    } else {
      const scheduledTime = new Date(dto.scheduledAt!);
      const windowMs = 5 * 60 * 1000;
      const existingScheduled = await this.ticketModel.findOne({
        userId: new Types.ObjectId(userId),
        status: 'SCHEDULED',
        mode: dto.mode,
        server: dto.server,
        scheduledAt: {
          $gte: new Date(scheduledTime.getTime() - windowMs),
          $lte: new Date(scheduledTime.getTime() + windowMs),
        },
      });
      if (existingScheduled) {
        return existingScheduled;
      }
    }

    const catalogId = await this.resolveCatalogId(dto.game);
    let elo = 1000;
    if (catalogId) {
      elo = await this.rankService.getPlayerElo(userId, catalogId.toString());
    }

    const ticket = await this.ticketModel.create({
      userId: new Types.ObjectId(userId),
      game: dto.game,
      mode: dto.mode,
      server: dto.server,
      region: dto.region,
      elo,
      status: isScheduled ? 'SCHEDULED' : 'SEARCHING',
      ...(isScheduled && { scheduledAt: new Date(dto.scheduledAt!) }),
      ...(dto.riotAccountInfo && { riotAccountInfo: dto.riotAccountInfo }),
    });

    return ticket;
  }

  // ──────────────────────────────────────────────────────────
  // CANCEL QUEUE
  // ──────────────────────────────────────────────────────────

  async cancelQueue(ticketId: string, userId: string) {
    const ticket = await this.ticketModel.findOne({
      _id: new Types.ObjectId(ticketId),
      userId: new Types.ObjectId(userId),
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.status = 'CANCELLED';
    await ticket.save();
  }

  // ──────────────────────────────────────────────────────────
  // RESPOND TO MATCH (accept/decline) → WS push
  // ──────────────────────────────────────────────────────────

  async respondToMatch(gameId: string, userId: string, accept: boolean) {
    const game = await this.gameModel.findById(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    await this.gameModel.updateOne(
      { _id: gameId, 'participants.userId': new Types.ObjectId(userId) },
      { $set: { 'participants.$.accepted': accept } },
    );

    const updated = await this.gameModel.findById(gameId);
    if (!updated) {
      throw new NotFoundException('Game not found after update');
    }

    if (updated.participants.some((p) => p.accepted === false)) {
      updated.status = 'CANCELLED';
      await updated.save();

      const participantIds = updated.participants.map((p) => p.userId);
      await this.ticketModel.updateMany(
        {
          userId: { $in: participantIds },
          status: 'MATCHED',
          gameId: new Types.ObjectId(gameId),
        },
        { $set: { status: 'CANCELLED' } },
      );

      this.gateway.emitMatchCancelled(gameId, 'player_declined');
    } else {
      this.gateway.emitPlayerResponse(gameId, userId, accept, updated);

      if (updated.participants.every((p) => p.accepted === true)) {
        updated.status = 'ACCEPTED';
        await updated.save();
        await this.createRoomForGame(gameId);

        const final = await this.gameModel.findById(gameId);
        this.gateway.emitGameRoomReady(gameId, final);
      }
    }

    return this.gameModel.findById(gameId);
  }

  // ──────────────────────────────────────────────────────────
  // COMPLETE MATCH → automatic elo update + WS push
  // ──────────────────────────────────────────────────────────

  async completeMatch(gameId: string, winningTeam: 'BLUE' | 'RED') {
    const game = await this.gameModel.findById(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const validStatuses = ['IN_PROGRESS', 'ACCEPTED'];
    if (!validStatuses.includes(game.status)) {
      throw new BadRequestException(
        `Game cannot be completed from status "${game.status}". Must be IN_PROGRESS or ACCEPTED.`,
      );
    }

    if (game.match_type !== 'MATCHMAKING') {
      throw new BadRequestException(
        'Only MATCHMAKING games use automatic elo updates',
      );
    }

    const catalogId = game.game_id;
    const participants = game.participants.map((p) => ({
      userId: p.userId,
      team: p.team,
      elo: p.elo,
    }));

    const eloResults = await this.rankService.processMatchCompletion(
      catalogId,
      participants,
      winningTeam,
      gameId,
    );

    game.status = 'COMPLETED';
    game.winningTeam = winningTeam;
    game.finished_at = new Date();
    await game.save();

    this.gateway.emitMatchCompleted(gameId, {
      game,
      eloUpdates: eloResults,
      winningTeam,
    });

    this.logger.log(
      `Match ${gameId} completed | winner=${winningTeam} | elo changes: ${eloResults.map((r) => `${r.userId}:${r.eloChange > 0 ? '+' : ''}${r.eloChange}`).join(', ')}`,
    );

    return { game, eloUpdates: eloResults };
  }

  // ──────────────────────────────────────────────────────────
  // READS
  // ──────────────────────────────────────────────────────────

  async getGame(gameId: string) {
    const game = await this.gameModel.findById(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async getActiveTicket(userId: string) {
    return this.ticketModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: { $in: ['SEARCHING', 'MATCHED'] },
      })
      .sort({ createdAt: -1 });
  }

  async getScheduledTickets(userId: string) {
    return this.ticketModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'SCHEDULED',
      })
      .sort({ scheduledAt: 1 });
  }

  async acknowledgeGame(gameId: string, userId: string) {
    const game = await this.gameModel.findOne({
      _id: new Types.ObjectId(gameId),
      'participants.userId': new Types.ObjectId(userId),
      status: 'ACCEPTED',
    });
    if (!game) {
      throw new NotFoundException('Game not found or not in ACCEPTED state');
    }
    game.status = 'IN_PROGRESS';
    await game.save();
    return game;
  }

  async getActiveGame(userId: string) {
    const pendingCutoff = new Date(Date.now() - 60 * 1000);
    const acceptedCutoff = new Date(Date.now() - 10 * 60 * 1000);

    return this.gameModel
      .findOne({
        'participants.userId': new Types.ObjectId(userId),
        $or: [
          {
            status: 'PENDING_ACCEPTANCE',
            createdAt: { $gte: pendingCutoff },
          },
          {
            status: 'ACCEPTED',
            createdAt: { $gte: acceptedCutoff },
          },
        ],
      })
      .sort({ createdAt: -1 });
  }

  // ──────────────────────────────────────────────────────────
  // ROOM CREATION
  // ──────────────────────────────────────────────────────────

  private async createRoomForGame(gameId: string) {
    const roomId = 'X-' + gameId.toString().slice(-6).toUpperCase();
    const map = "Summoner's Rift";

    await this.gameModel.findByIdAndUpdate(gameId, {
      $set: { roomInfo: { roomId, map } },
    });
  }

  // ──────────────────────────────────────────────────────────
  // MATCHMAKING LOOP (runs every 3 seconds)
  // ──────────────────────────────────────────────────────────

  @Interval(3000)
  async matchmakingLoop() {
    await this.activateScheduledTickets();
    await this.expireUnacceptedGames();

    for (const { mode, requiredPlayers } of MODES) {
      try {
        await this.tryMatchForMode(mode, requiredPlayers);
      } catch (err) {
        this.logger.error(`Matchmaking error for mode ${mode}: ${err.message}`);
      }
    }
  }

  private async expireUnacceptedGames() {
    const cutoff = new Date(Date.now() - GAME_ACCEPTANCE_TIMEOUT_S * 1000);

    const expiredGames = await this.gameModel.find({
      status: 'PENDING_ACCEPTANCE',
      match_type: 'MATCHMAKING',
      scheduled_at: { $lte: cutoff },
    });

    for (const game of expiredGames) {
      game.status = 'CANCELLED';
      await game.save();

      const participantIds = game.participants.map((p) => p.userId);
      await this.ticketModel.updateMany(
        { userId: { $in: participantIds }, status: 'MATCHED' },
        { $set: { status: 'CANCELLED' } },
      );

      this.gateway.emitMatchCancelled(game._id.toString(), 'expired');

      this.logger.warn(
        `Game ${game._id} expired (no response within ${GAME_ACCEPTANCE_TIMEOUT_S}s)`,
      );
    }
  }

  private async activateScheduledTickets() {
    const now = new Date();
    const result = await this.ticketModel.updateMany(
      { status: 'SCHEDULED', scheduledAt: { $lte: now } },
      { $set: { status: 'SEARCHING' } },
    );
    if (result.modifiedCount > 0) {
      this.logger.log(`Activated ${result.modifiedCount} scheduled ticket(s)`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // MATCHING LOGIC — dynamic elo threshold + WS push
  // ──────────────────────────────────────────────────────────

  private async tryMatchForMode(mode: string, requiredPlayers: number) {
    const allTickets = await this.ticketModel
      .find({ game: 'LOL', mode, status: 'SEARCHING' })
      .sort({ elo: 1, createdAt: 1 })
      .exec();

    if (allTickets.length < requiredPlayers) return;

    const byServer = new Map<string, MatchmakingTicketDocument[]>();
    for (const ticket of allTickets) {
      const server = (
        ticket.server ??
        ticket.region ??
        'UNKNOWN'
      ).toUpperCase();
      if (!byServer.has(server)) byServer.set(server, []);
      byServer.get(server)!.push(ticket);
    }

    const matched = new Set<string>();

    for (const [, tickets] of byServer) {
      if (tickets.length < requiredPlayers) continue;

      for (let i = 0; i + requiredPlayers - 1 < tickets.length; i++) {
        if (matched.has(tickets[i]._id.toString())) continue;

        const anchor = tickets[i];
        const dynamicThreshold = this.calculateDynamicThreshold(
          (anchor as any).createdAt,
        );

        const group: MatchmakingTicketDocument[] = [anchor];
        let effectiveRegion = (anchor.region ?? 'ALL').toUpperCase();

        for (
          let j = i + 1;
          j < tickets.length && group.length < requiredPlayers;
          j++
        ) {
          if (matched.has(tickets[j]._id.toString())) continue;

          const elos = [...group.map((t) => t.elo), tickets[j].elo];
          if (Math.max(...elos) - Math.min(...elos) > dynamicThreshold)
            continue;

          const candidateRegion = (tickets[j].region ?? 'ALL').toUpperCase();

          if (effectiveRegion === 'ALL') {
            group.push(tickets[j]);
            if (candidateRegion !== 'ALL') effectiveRegion = candidateRegion;
          } else if (
            candidateRegion === 'ALL' ||
            candidateRegion === effectiveRegion
          ) {
            group.push(tickets[j]);
          }
        }

        if (group.length === requiredPlayers) {
          await this.createMatchFromGroup(group, mode);
          group.forEach((t) => matched.add(t._id.toString()));
        }
      }
    }
  }

  private async createMatchFromGroup(
    group: MatchmakingTicketDocument[],
    mode: string,
  ) {
    const catalogId = await this.resolveCatalogId('LOL');
    const finalCatalogId = catalogId ?? new Types.ObjectId();

    const half = Math.ceil(group.length / 2);
    const hasScheduledTicket = group.some((t) => t.scheduledAt != null);

    const participants = group.map((ticket, index) => ({
      userId: ticket.userId,
      team: index < half ? 'BLUE' : 'RED',
      accepted: null,
      elo: ticket.elo,
      riotAccountInfo: ticket.riotAccountInfo ?? null,
    }));

    const game = await this.gameModel.create({
      game_id: finalCatalogId,
      match_type: 'MATCHMAKING',
      status: 'PENDING_ACCEPTANCE',
      mode,
      server: group[0].server,
      region: group[0].region,
      isScheduled: hasScheduledTicket,
      scheduled_at: new Date(),
      number_of_participant: group.length,
      participants,
    });

    await this.ticketModel.updateMany(
      { _id: { $in: group.map((t) => t._id) } },
      { $set: { status: 'MATCHED', gameId: game._id } },
    );

    const userIds = group.map((t) => t.userId.toString());
    this.gateway.emitMatchFound(userIds, game);

    this.logger.log(
      `Match created: ${game._id} | mode=${mode} | server=${group[0].server} | players=${group.length}`,
    );
  }
}
