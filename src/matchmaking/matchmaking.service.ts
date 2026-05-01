import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
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
import { User, UserDocument } from '../user/schemas/user.schema';
import { PlayerProfile, PlayerProfileDocument } from '../player/schemas/player-profile.schema';
import { PlayerGameProfileService } from '../player/services/player-game-profile.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PartyService } from '../party/party.service';

// ──────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────

const MODES = [
    { mode: 'CUSTOM_1V1', requiredPlayers: 2 },
    { mode: 'CUSTOM_2V2', requiredPlayers: 4 },
    { mode: 'CUSTOM_5V5', requiredPlayers: 10 },
    { mode: 'RANKED_SOLO_5V5', requiredPlayers: 10 },
    { mode: 'RANKED_SOLO_1V1', requiredPlayers: 2 },
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
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(PlayerProfile.name)
        private readonly playerModel: Model<PlayerProfileDocument>,
        private readonly playerGameProfileService: PlayerGameProfileService,
        private readonly eventEmitter: EventEmitter2,
        @Inject(forwardRef(() => PartyService))
        private readonly partyService: PartyService,
    ) {}

    // ──────────────────────────────────────────────────────────
    // CATALOG RESOLUTION (with in-memory cache)
    // ──────────────────────────────────────────────────────────

    private async resolveCatalogId(gameKey: string): Promise<Types.ObjectId | null> {
        if (this.catalogCache.has(gameKey)) {
            return this.catalogCache.get(gameKey)!;
        }

        const patterns: Record<string, RegExp> = {
            LOL: /league of legends|lol/i,
            VALORANT: /valorant/i,
            DOTA2: /dota\s*2/i,
            CS2: /counter-strike\s*2|cs\s*2|csgo/i,
        };

        const regex = patterns[gameKey.toUpperCase()];
        if (!regex) return null;

        const catalog = await this.catalogModel.findOne({ title: { $regex: regex } }).exec();
        if (catalog) {
            this.catalogCache.set(gameKey, catalog._id as Types.ObjectId);
            return catalog._id as Types.ObjectId;
        }

        return null;
    }

    // ──────────────────────────────────────────────────────────
    // DYNAMIC ELO THRESHOLD
    // ──────────────────────────────────────────────────────────

    private calculateDynamicThreshold(ticketCreatedAt: Date): number {
        const waitMs = Date.now() - ticketCreatedAt.getTime();
        const expansions = Math.floor(waitMs / EXPAND_INTERVAL_MS);
        const range = Math.min(INITIAL_ELO_RANGE + expansions * EXPAND_PER_INTERVAL, MAX_ELO_RANGE);
        return range * 2;
    }

    private resolveParticipantIdentity(user: UserDocument | undefined, userId: Types.ObjectId) {
        const fallbackId = userId.toString().slice(-4);
        const emailName = (user?.email ?? '').split('@')[0]?.trim();
        const nickname = (user?.nickname ?? '').trim();
        const steamName = (user?.steamUsername ?? '').trim();

        const username =
            nickname ||
            steamName ||
            emailName ||
            (fallbackId ? `Player ${fallbackId}` : 'Player');

        const steamPersonaName = steamName || undefined;

        return { username, steamPersonaName };
    }

    private async hasVerifiedGameLink(
        memberId: string,
        gameKey: string,
        catalogId?: Types.ObjectId | null,
    ): Promise<boolean> {
        if (catalogId) {
            const perGame = await this.playerGameProfileService.getProfile(
                memberId,
                catalogId.toString(),
            );
            if (perGame?.linkStatus === 'VERIFIED') return true;
        }

        const upperGame = (gameKey || '').toUpperCase();
        const isRiotGame = upperGame === 'LOL' || upperGame === 'VALORANT';
        if (isRiotGame) {
            const profile = await this.playerModel
                .findOne({ userId: new Types.ObjectId(memberId) })
                .select('riotLinkStatus')
                .lean();
            return (
                profile?.riotLinkStatus === 'verified'
            );
        }

        const user = await this.userModel
            .findById(new Types.ObjectId(memberId))
            .select('steamVerified steamId')
            .lean();
        return !!(user?.steamVerified || user?.steamId);
    }

    private isMissingDisplayName(value: string | undefined) {
        const normalized = (value ?? '').trim().toLowerCase();
        return !normalized || normalized === 'player' || normalized.startsWith('player ');
    }

    private async hydrateGameParticipantIdentities(game: GameDocument): Promise<GameDocument> {
        if (!game?.participants?.length) return game;

        const ids = game.participants.map((p) => p.userId).filter(Boolean);
        if (!ids.length) return game;

        const users = await this.userModel.find({ _id: { $in: ids } }).exec();
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));
        let changed = false;

        for (const participant of game.participants) {
            const user = userMap.get(participant.userId.toString());
            const identity = this.resolveParticipantIdentity(user, participant.userId);

            if (this.isMissingDisplayName(participant.username) && identity.username) {
                participant.username = identity.username;
                changed = true;
            }

            if (!participant.steamPersonaName && identity.steamPersonaName) {
                participant.steamPersonaName = identity.steamPersonaName;
                changed = true;
            }
        }

        if (!game.teams || !game.teams.blue || !game.teams.red) {
            game.teams = {
                blue: game.participants.filter((p) => p.team === 'BLUE'),
                red: game.participants.filter((p) => p.team === 'RED'),
            };
            changed = true;
        } else {
            game.teams.blue = game.participants.filter((p) => p.team === 'BLUE');
            game.teams.red = game.participants.filter((p) => p.team === 'RED');
            changed = true;
        }

        if (changed) {
            await game.save();
        }

        return game;
    }

    // ──────────────────────────────────────────────────────────
    // JOIN QUEUE
    // ──────────────────────────────────────────────────────────

    async joinQueue(userId: string, dto: JoinQueueDto) {
        const isScheduled = !!dto.scheduledAt;
        let partyId: Types.ObjectId | null = null;
        let partyMembers: string[] = [userId];
        let partyTicketHostId: string = userId;
        let partyGameId: string | null = null;

        if (dto.partyId) {
            const party = await this.partyService
                .getParty(dto.partyId)
                .catch(() => null);
            if (!party) {
                throw new BadRequestException('Invalid partyId');
            }

            const requesterInParty = party.members.some((m) => m.userId === userId);
            if (!requesterInParty) {
                throw new ForbiddenException('User is not a member of this party');
            }

            if (party.status !== 'READY') {
                throw new BadRequestException('Party must be READY to queue');
            }

            const acceptedMembers = party.members.filter((m) => m.status === 'ACCEPTED');
            partyMembers = acceptedMembers.map((m) => m.userId);
            partyId = new Types.ObjectId(party.id);
            partyTicketHostId = party.hostUserId;
            partyGameId = party.gameId;
        }

        const catalogId = await this.resolveCatalogId(dto.game);
        if (partyGameId && catalogId && partyGameId !== catalogId.toString()) {
            throw new BadRequestException('Party game does not match queue game');
        }

        if (partyMembers.length > 1) {
            for (const memberId of partyMembers) {
                const verified = await this.hasVerifiedGameLink(
                    memberId,
                    dto.game,
                    catalogId,
                );
                if (!verified) {
                    throw new BadRequestException(
                        `User ${memberId} has not verified account link for this game`,
                    );
                }
            }
        }

        if (!isScheduled) {
            for (const memberId of partyMembers) {
                await this.ticketModel.updateMany(
                    { userId: new Types.ObjectId(memberId), status: 'MATCHED' },
                    { $set: { status: 'CANCELLED' } },
                );

                await this.gameModel.updateMany(
                    {
                        'participants.userId': new Types.ObjectId(memberId),
                        status: 'PENDING_ACCEPTANCE',
                        match_type: 'MATCHMAKING',
                    },
                    { $set: { status: 'CANCELLED' } },
                );

                const existingSearch = await this.ticketModel.findOne({
                    userId: new Types.ObjectId(memberId),
                    status: 'SEARCHING',
                    ...(partyId ? { partyId } : {}),
                });
                if (existingSearch) {
                    return existingSearch;
                }
            }
        } else {
            const scheduledTime = new Date(dto.scheduledAt!);
            const windowMs = 5 * 60 * 1000;
            for (const memberId of partyMembers) {
                const existingScheduled = await this.ticketModel.findOne({
                    userId: new Types.ObjectId(memberId),
                    status: 'SCHEDULED',
                    mode: dto.mode,
                    server: dto.server,
                    ...(partyId ? { partyId } : {}),
                    scheduledAt: {
                        $gte: new Date(scheduledTime.getTime() - windowMs),
                        $lte: new Date(scheduledTime.getTime() + windowMs),
                    },
                });
                if (existingScheduled) {
                    return existingScheduled;
                }
            }
        }

        const tickets: MatchmakingTicketDocument[] = [];
        for (const partyMemberId of partyMembers) {
            let elo = 1000;
            if (catalogId) {
                elo = await this.rankService.getPlayerElo(
                    partyMemberId,
                    catalogId.toString(),
                );
            }

            const ticket = await this.ticketModel.create({
                userId: new Types.ObjectId(partyMemberId),
                game: dto.game,
                mode: dto.mode,
                server: dto.server,
                region: dto.region,
                elo,
                status: isScheduled ? 'SCHEDULED' : 'SEARCHING',
                ...(partyId ? { partyId } : {}),
                ...(isScheduled && { scheduledAt: new Date(dto.scheduledAt!) }),
                ...(dto.riotAccountInfo && { riotAccountInfo: dto.riotAccountInfo }),
            });
            tickets.push(ticket);
        }

        if (partyId && !isScheduled) {
            const party = await this.partyService.getParty(partyId.toString()).catch(() => null);
            if (party) {
                await this.partyService.startQueueing(
                    party.id,
                    party.hostUserId,
                    tickets[0]._id.toString(),
                );
            }
        }

        return (
            tickets.find((t) => t.userId.toString() === partyTicketHostId) ||
            tickets.find((t) => t.userId.toString() === userId) ||
            tickets[0]
        );
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
                
                // Safety: Reconstruct teams if missing from schema update period
                if (!updated.teams || !updated.teams.blue) {
                    updated.teams = {
                        blue: updated.participants.filter(p => p.team === 'BLUE'),
                        red: updated.participants.filter(p => p.team === 'RED'),
                    };
                }

                await updated.save();
                await this.createRoomForGame(gameId);

                const finalRaw = await this.gameModel.findById(gameId);
                const final = finalRaw
                    ? await this.hydrateGameParticipantIdentities(finalRaw)
                    : null;
                
                if (final) {
                    console.log(`[Matchmaking] Emit GameRoomReady for ${gameId}, roomInfo:`, final.roomInfo);
                    this.gateway.emitGameRoomReady(gameId, final);
                }
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
            throw new BadRequestException('Only MATCHMAKING games use automatic elo updates');
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
            game.mode,
            game.partyId ? game.partyId.toString() : undefined,
        );

        const rankedModes = new Set(['RANKED_5V5', 'RANKED_SOLO_5V5', 'RANKED_SOLO_1V1']);
        const customModes = new Set(['CUSTOM_1V1', 'CUSTOM_2V2']);

        if (rankedModes.has(game.mode || '')) {
            for (const result of eloResults) {
                await this.playerGameProfileService.updateElo(
                    result.userId.toString(),
                    catalogId.toString(),
                    result.eloChange,
                    result.didWin,
                );
            }
        } else if (customModes.has(game.mode || '')) {
            for (const participant of game.participants) {
                const isWin = participant.team === winningTeam;
                await this.playerGameProfileService.updateCustomStats(
                    participant.userId.toString(),
                    catalogId.toString(),
                    isWin,
                );
            }
        }

        game.status = 'COMPLETED';
        game.winningTeam = winningTeam;
        game.finished_at = new Date();
        await game.save();

        this.gateway.emitMatchCompleted(gameId, {
            game,
            eloUpdates: eloResults,
            winningTeam,
        });

        const eventMode: 'RANKED' | 'UNRANKED' = rankedModes.has(game.mode || '') ? 'RANKED' : 'UNRANKED';
        for (const participant of game.participants) {
            const won = participant.team === winningTeam;
            const xpAmount = won ? 150 : 50;
            this.eventEmitter.emit('match.completed', {
                matchId: gameId,
                userId: participant.userId.toString(),
                mode: eventMode,
                won,
                gameId: catalogId.toString(),
                partyId: game.partyId ? game.partyId.toString() : undefined,
                xpAmount,
            });
        }

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
        return this.hydrateGameParticipantIdentities(game);
    }

    async getActiveTicket(userId: string) {
        return this.ticketModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: ['SEARCHING', 'MATCHED'] },
        }).sort({ createdAt: -1 });
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
            throw new NotFoundException(
                'Game not found or not in ACCEPTED state',
            );
        }
        game.status = 'IN_PROGRESS';
        await game.save();
        return game;
    }

    async getActiveGame(userId: string) {
        const pendingCutoff = new Date(Date.now() - 60 * 1000);
        const acceptedCutoff = new Date(Date.now() - 10 * 60 * 1000);
        const inProgressCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);

        const game = await this.gameModel
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
                    {
                        status: 'IN_PROGRESS',
                        createdAt: { $gte: inProgressCutoff },
                    },
                ],
            })
            .sort({ createdAt: -1 });

        if (!game) return null;
        return this.hydrateGameParticipantIdentities(game);
    }

    async updateLobbyId(gameId: string, steamLobbyId: string, hostSteamId?: string) {
        const game = await this.gameModel.findById(gameId);
        if (!game) throw new NotFoundException('Game not found');

        if (!game.roomInfo) game.roomInfo = { roomId: '' };
        game.roomInfo.steamLobbyId = steamLobbyId;
        await game.save();

        this.gateway.emitLobbyIdUpdated(gameId, steamLobbyId, hostSteamId);
        return game;
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

        // Get all unique game keys from searching tickets
        const activeGames = await this.ticketModel.distinct('game', { status: 'SEARCHING' });

        for (const gameKey of activeGames) {
            for (const { mode, requiredPlayers } of MODES) {
                try {
                    await this.tryMatchForMode(gameKey, mode, requiredPlayers);
                } catch (err) {
                    this.logger.error(
                        `Matchmaking error for game ${gameKey} mode ${mode}: ${err.message}`,
                    );
                }
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

            this.gateway.emitMatchCancelled(
                game._id.toString(),
                'expired',
            );

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
            this.logger.log(
                `Activated ${result.modifiedCount} scheduled ticket(s)`,
            );
        }
    }

    // ──────────────────────────────────────────────────────────
    // MATCHING LOGIC — dynamic elo threshold + WS push
    // ──────────────────────────────────────────────────────────

    private async tryMatchForMode(gameKey: string, mode: string, requiredPlayers: number) {
        const allTickets = await this.ticketModel
            .find({ game: gameKey, mode, status: 'SEARCHING' })
            .sort({ elo: 1, createdAt: 1 })
            .exec();

        if (allTickets.length < requiredPlayers) return;

        const byServer = new Map<string, MatchmakingTicketDocument[]>();
        for (const ticket of allTickets) {
            const server = (ticket.server ?? ticket.region ?? 'UNKNOWN').toUpperCase();
            if (!byServer.has(server)) byServer.set(server, []);
            byServer.get(server)!.push(ticket);
        }

        const matched = new Set<string>();

        for (const [, tickets] of byServer) {
            if (tickets.length < requiredPlayers) continue;

            const unitMap = new Map<string, MatchmakingTicketDocument[]>();
            for (const ticket of tickets) {
                if (matched.has(ticket._id.toString())) continue;
                const unitKey = ticket.partyId
                    ? `party:${ticket.partyId.toString()}`
                    : `solo:${ticket._id.toString()}`;
                if (!unitMap.has(unitKey)) unitMap.set(unitKey, []);
                unitMap.get(unitKey)!.push(ticket);
            }

            const units = Array.from(unitMap.values()).sort((a, b) => {
                const aTime = new Date((a[0] as any).createdAt).getTime();
                const bTime = new Date((b[0] as any).createdAt).getTime();
                return aTime - bTime;
            });

            for (let i = 0; i < units.length; i++) {
                const anchorUnit = units[i];
                if (!anchorUnit.length) continue;
                if (anchorUnit.some((t) => matched.has(t._id.toString()))) continue;

                const anchor = anchorUnit[0];
                const dynamicThreshold = this.calculateDynamicThreshold(
                    (anchor as any).createdAt,
                );

                const group: MatchmakingTicketDocument[] = [...anchorUnit];
                if (group.length > requiredPlayers) continue;
                let effectiveRegion = (anchor.region ?? 'ALL').toUpperCase();

                for (let j = i + 1; j < units.length && group.length < requiredPlayers; j++) {
                    const unit = units[j];
                    if (!unit.length) continue;
                    if (unit.some((t) => matched.has(t._id.toString()))) continue;
                    if (group.length + unit.length > requiredPlayers) continue;

                    const candidateRegion = (unit[0].region ?? 'ALL').toUpperCase();
                    let regionOk = false;
                    if (effectiveRegion === 'ALL') {
                        regionOk = true;
                    } else if (candidateRegion === 'ALL' || candidateRegion === effectiveRegion) {
                        regionOk = true;
                    }
                    if (!regionOk) continue;

                    const combined = [...group, ...unit];
                    const elos = combined.map((t) => t.elo);
                    if (Math.max(...elos) - Math.min(...elos) > dynamicThreshold) continue;

                    group.push(...unit);
                    if (effectiveRegion === 'ALL' && candidateRegion !== 'ALL') {
                        effectiveRegion = candidateRegion;
                    }
                }

                if (group.length === requiredPlayers) {
                    await this.createMatchFromGroup(group, gameKey, mode);
                    group.forEach((t) => matched.add(t._id.toString()));
                }
            }
        }
    }

    private async createMatchFromGroup(
        group: MatchmakingTicketDocument[],
        gameKey: string,
        mode: string,
    ) {
        const catalogId = await this.resolveCatalogId(gameKey);
        const finalCatalogId = catalogId ?? new Types.ObjectId();

        const half = Math.ceil(group.length / 2);
        const hasScheduledTicket = group.some((t) => t.scheduledAt != null);
        const isPartyMatch =
            !!group[0].partyId &&
            group.every(
                (t) =>
                    !!t.partyId &&
                    t.partyId.toString() === group[0].partyId!.toString(),
            );
        const firstPartyId = group[0].partyId;

        // Fetch user documents to get steamId
        const userIds = group.map((t) => t.userId);
        const users = await this.userModel.find({ _id: { $in: userIds } }).exec();
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        // Fetch profiles to get verified Riot IDs
        const profiles = await this.playerModel.find({ userId: { $in: userIds.map(id => id.toString()) } }).exec();
        const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

        const participants = group.map((ticket, index) => {
            const user = userMap.get(ticket.userId.toString());
            const profile = profileMap.get(ticket.userId.toString());
            const identity = this.resolveParticipantIdentity(user, ticket.userId);
            
            // Inclusion of official Riot info from verified PlayerProfile
            const riotInfo = profile?.riotGameName 
                ? `${profile.riotGameName}#${profile.riotTagLine}` 
                : (ticket.riotAccountInfo || undefined);

            return {
                userId: ticket.userId,
                username: identity.username,
                riotName: riotInfo, // Official League name
                steamPersonaName: identity.steamPersonaName,
                avatar: user?.steamAvatarUrl || user?.avatar || undefined,
                steamId: user?.steamId || undefined,
                team: (index < half ? 'BLUE' : 'RED') as 'BLUE' | 'RED',
                accepted: null,
                elo: ticket.elo,
                riotAccountInfo: riotInfo,
            };
        });

        const teams = {
            blue: participants.filter(p => p.team === 'BLUE'),
            red: participants.filter(p => p.team === 'RED'),
        };

        const gamePayload: any = {
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
            teams, // Include structured teams in payload
            hostUserId: group[0].userId,
            partyId: isPartyMatch ? firstPartyId : undefined,
        };

        const [game] = await this.gameModel.create([gamePayload]);

        await this.ticketModel.updateMany(
            { _id: { $in: group.map((t) => t._id) } },
            { $set: { status: 'MATCHED', gameId: game._id } },
        );

        if (isPartyMatch && firstPartyId) {
            await this.partyService
                .matchParty(firstPartyId.toString(), game._id.toString())
                .catch(() => null);
        }

        this.gateway.emitMatchFound(userIds.map(id => id.toString()), game);

        this.logger.log(
            `Match created: ${game._id} | mode=${mode} | server=${group[0].server} | host=${group[0].userId} | players=${group.length} | party=${isPartyMatch && firstPartyId ? firstPartyId.toString() : 'none'}`,
        );
    }
}
