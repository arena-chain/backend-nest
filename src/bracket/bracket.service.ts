import {
    Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    Bracket, BracketDocument, BracketFormat, BracketStatus, BracketSlotStatus, BracketSlot,
} from './schemas/bracket.schema';
import { CreateBracketDto, AdvanceSlotDto } from './dto/create-bracket.dto';
import { StandingsService } from '../standings/standings.service';

@Injectable()
export class BracketService {
    constructor(
        @InjectModel(Bracket.name) private readonly bracketModel: Model<BracketDocument>,
        private readonly standingsService: StandingsService,
    ) {}

    /**
     * Generates a full single-elimination bracket from a seeded list of teams.
     * If seededTeamIds is omitted or empty, seeds from current season standings (by rank).
     */
    async generate(dto: CreateBracketDto): Promise<Bracket> {
        const existing = await this.bracketModel.findOne({ seasonId: dto.seasonId });
        if (existing) throw new ConflictException('A bracket already exists for this season.');

        let teams: string[];
        if (dto.seededTeamIds && dto.seededTeamIds.length > 0) {
            teams = [...dto.seededTeamIds];
        } else {
            const standings = await this.standingsService.findBySeason(dto.seasonId);
            teams = standings.map((s) => String(s.teamId));
            if (teams.length < 2) {
                throw new BadRequestException(
                    'At least 2 teams with standings are required. Register teams and play matches first, or send seededTeamIds in the body.',
                );
            }
        }

        const n = teams.length;
        if (n < 2) throw new BadRequestException('At least 2 teams are required.');

        const totalRounds = Math.ceil(Math.log2(n));
        const slots: BracketSlot[] = [];

        if (dto.format === BracketFormat.SINGLE_ELIMINATION) {
            this.buildSingleElimination(teams, totalRounds, slots);
        } else {
            // Double elimination is more complex; build upper + lower bracket
            this.buildSingleElimination(teams, totalRounds, slots);
        }

        return this.bracketModel.create({
            seasonId: dto.seasonId,
            format: dto.format,
            totalRounds,
            slots,
            status: BracketStatus.PENDING,
        });
    }

    private buildSingleElimination(teams: string[], totalRounds: number, slots: BracketSlot[]): void {
        const bracketSize = Math.pow(2, totalRounds);
        const paddedTeams: (string | null)[] = [...teams];

        while (paddedTeams.length < bracketSize) {
            paddedTeams.push(null); // BYE slots
        }

        let slotCounter = 1;
        const roundSlotIds: string[][] = [];

        for (let round = 1; round <= totalRounds; round++) {
            const matchesInRound = bracketSize / Math.pow(2, round);
            const roundIds: string[] = [];
            for (let pos = 1; pos <= matchesInRound; pos++) {
                roundIds.push(`R${round}S${pos}`);
            }
            roundSlotIds.push(roundIds);
        }

        // Round 1 — seed the teams
        const r1Matches = bracketSize / 2;
        for (let pos = 1; pos <= r1Matches; pos++) {
            const t1 = paddedTeams[(pos - 1) * 2];
            const t2 = paddedTeams[(pos - 1) * 2 + 1];
            const slotId = `R1S${pos}`;
            const nextSlotId = roundSlotIds[1]?.[Math.ceil(pos / 2) - 1];

            const isBye = t1 !== null && t2 === null;

            slots.push({
                slotId,
                roundNumber: 1,
                position: pos,
                team1Id: t1 ?? undefined,
                team2Id: t2 ?? undefined,
                nextSlotId,
                status: isBye ? BracketSlotStatus.BYE : (t1 && t2 ? BracketSlotStatus.READY : BracketSlotStatus.PENDING),
            } as BracketSlot);
        }

        // Remaining rounds — empty slots waiting for winners
        for (let round = 2; round <= totalRounds; round++) {
            const matchesInRound = bracketSize / Math.pow(2, round);
            for (let pos = 1; pos <= matchesInRound; pos++) {
                const slotId = `R${round}S${pos}`;
                const nextSlotId = round < totalRounds
                    ? roundSlotIds[round]?.[Math.ceil(pos / 2) - 1]
                    : undefined;

                slots.push({
                    slotId,
                    roundNumber: round,
                    position: pos,
                    nextSlotId,
                    status: BracketSlotStatus.PENDING,
                } as BracketSlot);
            }
        }
    }

    async advanceWinner(seasonId: string, dto: AdvanceSlotDto): Promise<Bracket> {
        const bracket = await this.bracketModel.findOne({ seasonId });
        if (!bracket) throw new NotFoundException('Bracket not found.');

        const slot = bracket.slots.find(s => s.slotId === dto.slotId);
        if (!slot) throw new NotFoundException(`Slot ${dto.slotId} not found.`);
        if (slot.status === BracketSlotStatus.COMPLETED) {
            throw new BadRequestException('This slot is already completed.');
        }

        slot.winnerId = dto.winnerId;
        slot.matchId = dto.matchId;
        slot.status = BracketSlotStatus.COMPLETED;

        if (slot.nextSlotId) {
            const nextSlot = bracket.slots.find(s => s.slotId === slot.nextSlotId);
            if (nextSlot) {
                if (!nextSlot.team1Id) {
                    nextSlot.team1Id = dto.winnerId;
                } else {
                    nextSlot.team2Id = dto.winnerId;
                }
                if (nextSlot.team1Id && nextSlot.team2Id) {
                    nextSlot.status = BracketSlotStatus.READY;
                }
            }
        }

        // Check if final is completed
        const isFinished = bracket.slots.every(s =>
            s.status === BracketSlotStatus.COMPLETED || s.status === BracketSlotStatus.BYE,
        );
        if (isFinished) {
            bracket.status = BracketStatus.COMPLETED;
            bracket.championId = dto.winnerId;
        } else {
            bracket.status = BracketStatus.ACTIVE;
        }

        bracket.markModified('slots');
        return bracket.save();
    }

    async findBySeason(seasonId: string): Promise<Bracket | null> {
        return this.bracketModel.findOne({ seasonId }).exec();
    }

    async findOne(id: string): Promise<Bracket> {
        const bracket = await this.bracketModel.findById(id).exec();
        if (!bracket) throw new NotFoundException('Bracket not found.');
        return bracket;
    }

    async delete(seasonId: string): Promise<void> {
        await this.bracketModel.findOneAndDelete({ seasonId }).exec();
    }
}
