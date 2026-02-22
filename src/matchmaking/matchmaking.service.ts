import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Interval } from '@nestjs/schedule';
import { Game, GameDocument } from '../games/entities/game.entity';
import {
    MatchmakingTicket,
    MatchmakingTicketDocument,
} from './schemas/matchmaking-ticket.schema';
import {
    PlayerProfile,
    PlayerProfileDocument,
} from '../player/schemas/player-profile.schema';
import { Catalog, CatalogDocument } from '../catalog/schemas/catalog.entity';
import { JoinQueueDto } from './dto/join-queue.dto';

const MODES = [
    { mode: 'CUSTOM_1V1', requiredPlayers: 2, eloThreshold: 150 },
    { mode: 'CUSTOM_2V2', requiredPlayers: 4, eloThreshold: 250 },
    { mode: 'CUSTOM_5V5', requiredPlayers: 10, eloThreshold: 250 },
];

@Injectable()
export class MatchmakingService {
    private readonly logger = new Logger(MatchmakingService.name);

    constructor(
        @InjectModel(Game.name)
        private readonly gameModel: Model<GameDocument>,
        @InjectModel(MatchmakingTicket.name)
        private readonly ticketModel: Model<MatchmakingTicketDocument>,
        @InjectModel(PlayerProfile.name)
        private readonly playerProfileModel: Model<PlayerProfileDocument>,
        @InjectModel(Catalog.name)
        private readonly catalogModel: Model<CatalogDocument>,
    ) {}

    async joinQueue(userId: string, dto: JoinQueueDto) {
        await this.ticketModel.updateMany(
            {
                userId: new Types.ObjectId(userId),
                status: 'MATCHED',
            },
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

        const existing = await this.ticketModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: ['SEARCHING', 'SCHEDULED'] },
        });
        if (existing) {
            return existing;
        }

        const profile = await this.playerProfileModel.findOne({
            userId: new Types.ObjectId(userId),
        });
        const elo = profile?.elo ?? 1000;

        const isScheduled = !!dto.scheduledAt;
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
        } else if (updated.participants.every((p) => p.accepted === true)) {
            updated.status = 'ACCEPTED';
            await updated.save();
            await this.createRoomForGame(gameId);
        }

        return this.gameModel.findById(gameId);
    }

    async getGame(gameId: string) {
        const game = await this.gameModel.findById(gameId);
        if (!game) {
            throw new NotFoundException('Game not found');
        }
        return game;
    }

    async getActiveTicket(userId: string) {
        return this.ticketModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: ['SEARCHING', 'SCHEDULED', 'MATCHED'] },
        }).sort({ createdAt: -1 });
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

    private async createRoomForGame(gameId: string) {
        const roomId = 'X-' + gameId.toString().slice(-6).toUpperCase();
        const map = "Summoner's Rift";

        await this.gameModel.findByIdAndUpdate(gameId, {
            $set: { roomInfo: { roomId, map } },
        });
    }

    @Interval(3000)
    async matchmakingLoop() {
        await this.activateScheduledTickets();
        await this.expireUnacceptedGames();

        for (const { mode, requiredPlayers, eloThreshold } of MODES) {
            try {
                await this.tryMatchForMode(mode, requiredPlayers, eloThreshold);
            } catch (err) {
                this.logger.error(
                    `Matchmaking error for mode ${mode}: ${err.message}`,
                );
            }
        }
    }

    private async expireUnacceptedGames() {
        const expirationSeconds = 15;
        const cutoff = new Date(Date.now() - expirationSeconds * 1000);

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

            this.logger.warn(
                `Game ${game._id} expired (no response within ${expirationSeconds}s)`,
            );
        }
    }

    private async activateScheduledTickets() {
        const now = new Date();
        const result = await this.ticketModel.updateMany(
            {
                status: 'SCHEDULED',
                scheduledAt: { $lte: now },
            },
            { $set: { status: 'SEARCHING' } },
        );
        if (result.modifiedCount > 0) {
            this.logger.log(
                `Activated ${result.modifiedCount} scheduled ticket(s)`,
            );
        }
    }

    private areRegionsCompatible(r1: string, r2: string): boolean {
        if (r1 === 'ALL' || r2 === 'ALL') return true;
        return r1 === r2;
    }

    private async tryMatchForMode(
        mode: string,
        requiredPlayers: number,
        eloThreshold: number,
    ) {
        const allTickets = await this.ticketModel
            .find({ game: 'LOL', mode, status: 'SEARCHING' })
            .sort({ elo: 1, createdAt: 1 })
            .exec();

        if (allTickets.length < requiredPlayers) {
            return;
        }

        const byServer = new Map<string, MatchmakingTicketDocument[]>();
        for (const ticket of allTickets) {
            const server = (ticket.server ?? ticket.region ?? 'UNKNOWN').toUpperCase();
            if (!byServer.has(server)) {
                byServer.set(server, []);
            }
            byServer.get(server)!.push(ticket);
        }

        const matched = new Set<string>();

        for (const [, tickets] of byServer) {
            if (tickets.length < requiredPlayers) continue;

            for (let i = 0; i + requiredPlayers - 1 < tickets.length; i++) {
                if (matched.has(tickets[i]._id.toString())) continue;

                const group: MatchmakingTicketDocument[] = [];
                group.push(tickets[i]);

                let effectiveRegion = (tickets[i].region ?? 'ALL').toUpperCase();

                for (
                    let j = i + 1;
                    j < tickets.length && group.length < requiredPlayers;
                    j++
                ) {
                    if (matched.has(tickets[j]._id.toString())) continue;

                    const elos = [...group.map((t) => t.elo), tickets[j].elo];
                    const minElo = Math.min(...elos);
                    const maxElo = Math.max(...elos);

                    if (maxElo - minElo > eloThreshold) continue;

                    const candidateRegion = (tickets[j].region ?? 'ALL').toUpperCase();

                    if (effectiveRegion === 'ALL') {
                        group.push(tickets[j]);
                        if (candidateRegion !== 'ALL') {
                            effectiveRegion = candidateRegion;
                        }
                    } else {
                        if (candidateRegion === 'ALL' || candidateRegion === effectiveRegion) {
                            group.push(tickets[j]);
                        }
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
        let lolCatalog = await this.catalogModel
            .findOne({ title: { $regex: /league of legends/i } })
            .exec();

        if (!lolCatalog) {
            lolCatalog = await this.catalogModel
                .findOne({ title: { $regex: /lol/i } })
                .exec();
        }

        const catalogId = lolCatalog
            ? lolCatalog._id
            : new Types.ObjectId();

        const requiredPlayers = group.length;
        const half = Math.ceil(requiredPlayers / 2);

        const hasScheduledTicket = group.some((t) => t.scheduledAt != null);

        const participants = group.map((ticket, index) => ({
            userId: ticket.userId,
            team: (index < half ? 'BLUE' : 'RED') as 'BLUE' | 'RED',
            accepted: null,
            elo: ticket.elo,
            riotAccountInfo: ticket.riotAccountInfo ?? null,
        }));

        const game = await this.gameModel.create({
            game_id: catalogId,
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

        this.logger.log(
            `Match created: ${game._id} | mode=${mode} | server=${group[0].server} | players=${group.length}`,
        );
    }
}
