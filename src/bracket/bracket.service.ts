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
     * Generates a bracket from a seeded list of teams.
     * Supports SINGLE_ELIMINATION and DOUBLE_ELIMINATION.
     * If seededTeamIds is omitted, seeds from current season standings (by rank).
     */
    async generate(dto: CreateBracketDto): Promise<Bracket> {
        const query: any = { seasonId: dto.seasonId };
        if (dto.stageId) query.stageId = dto.stageId;
        const existing = await this.bracketModel.findOne(query);
        if (existing) throw new ConflictException('A bracket already exists for this season/stage.');

        let teams: string[];
        if (dto.seededTeamIds && dto.seededTeamIds.length > 0) {
            teams = [...dto.seededTeamIds];
        } else {
            const standings = await this.standingsService.findBySeason(dto.seasonId);
            teams = standings.map((s) => String(s.teamId));
            if (teams.length < 2) {
                throw new BadRequestException(
                    'At least 2 teams required. Provide seededTeamIds or ensure standings exist.',
                );
            }
        }

        const n = teams.length;
        if (n < 2) throw new BadRequestException('At least 2 teams are required.');

        const ubRounds = Math.ceil(Math.log2(n));
        const slots: BracketSlot[] = [];

        if (dto.format === BracketFormat.DOUBLE_ELIMINATION) {
            this.buildDoubleElimination(teams, ubRounds, slots);
        } else {
            this.buildSingleElimination(teams, ubRounds, slots);
        }

        const totalRounds = dto.format === BracketFormat.DOUBLE_ELIMINATION
            ? ubRounds + 2 * (ubRounds - 1) + 1
            : ubRounds;

        return this.bracketModel.create({
            seasonId: dto.seasonId,
            ...(dto.stageId && { stageId: dto.stageId }),
            format: dto.format,
            totalRounds,
            slots,
            status: BracketStatus.PENDING,
        });
    }

    // ─── Single Elimination ─────────────────────────────────────────────────────

    private buildSingleElimination(teams: string[], totalRounds: number, slots: BracketSlot[]): void {
        const bracketSize = Math.pow(2, totalRounds);
        const paddedTeams: (string | null)[] = [...teams];
        while (paddedTeams.length < bracketSize) paddedTeams.push(null);

        // Round 1 — seed the teams
        const r1Matches = bracketSize / 2;
        for (let pos = 1; pos <= r1Matches; pos++) {
            const t1 = paddedTeams[(pos - 1) * 2];
            const t2 = paddedTeams[(pos - 1) * 2 + 1];
            const isBye = t1 !== null && t2 === null;
            const nextPos = Math.ceil(pos / 2);
            const nextSlotId = totalRounds > 1 ? `R2S${nextPos}` : undefined;

            slots.push({
                slotId: `R1S${pos}`,
                roundNumber: 1,
                position: pos,
                team1Id: t1 ?? undefined,
                team2Id: t2 ?? undefined,
                nextSlotId,
                status: isBye ? BracketSlotStatus.BYE : (t1 && t2 ? BracketSlotStatus.READY : BracketSlotStatus.PENDING),
            } as BracketSlot);
        }

        // Remaining rounds
        for (let round = 2; round <= totalRounds; round++) {
            const matchesInRound = bracketSize / Math.pow(2, round);
            for (let pos = 1; pos <= matchesInRound; pos++) {
                const nextPos = Math.ceil(pos / 2);
                const nextSlotId = round < totalRounds ? `R${round + 1}S${nextPos}` : undefined;
                slots.push({
                    slotId: `R${round}S${pos}`,
                    roundNumber: round,
                    position: pos,
                    nextSlotId,
                    status: BracketSlotStatus.PENDING,
                } as BracketSlot);
            }
        }
    }

    // ─── Double Elimination ──────────────────────────────────────────────────────

    /**
     * Builds a double-elimination bracket.
     * Slot naming:
     *   Upper Bracket: UB-R{round}M{pos}
     *   Lower Bracket: LB-R{round}M{pos}
     *   Grand Final:   GF
     *
     * For N teams (padded to power of 2):
     *   UB has ubRounds rounds
     *   LB has 2*(ubRounds-1) rounds
     *   1 Grand Final
     */
    private buildDoubleElimination(teams: string[], ubRounds: number, slots: BracketSlot[]): void {
        const bracketSize = Math.pow(2, ubRounds);
        const paddedTeams: (string | null)[] = [...teams];
        while (paddedTeams.length < bracketSize) paddedTeams.push(null);

        const lbTotalRounds = 2 * (ubRounds - 1);

        // ── UB Round 1 (seeded) ──
        const r1Matches = bracketSize / 2;
        for (let pos = 1; pos <= r1Matches; pos++) {
            const t1 = paddedTeams[(pos - 1) * 2];
            const t2 = paddedTeams[(pos - 1) * 2 + 1];
            const isBye = t1 !== null && t2 === null;
            const nextPos = Math.ceil(pos / 2);
            const nextSlotId = ubRounds > 1 ? `UB-R2M${nextPos}` : 'GF';
            const lbR1Pos = Math.ceil(pos / 2);
            const loserNextSlotId = lbTotalRounds > 0 ? `LB-R1M${lbR1Pos}` : undefined;

            slots.push({
                slotId: `UB-R1M${pos}`,
                roundNumber: 1,
                position: pos,
                team1Id: t1 ?? undefined,
                team2Id: t2 ?? undefined,
                nextSlotId,
                loserNextSlotId,
                status: isBye
                    ? BracketSlotStatus.BYE
                    : (t1 && t2 ? BracketSlotStatus.READY : BracketSlotStatus.PENDING),
            } as BracketSlot);
        }

        // ── UB Rounds 2 through ubRounds-1 ──
        for (let r = 2; r < ubRounds; r++) {
            const matchCount = bracketSize / Math.pow(2, r);
            for (let pos = 1; pos <= matchCount; pos++) {
                const nextPos = Math.ceil(pos / 2);
                const nextSlotId = `UB-R${r + 1}M${nextPos}`;
                // Losers of UB-Rr drop into LB round (2*r - 2)
                const lbDropInRound = 2 * r - 2;
                const loserNextSlotId = `LB-R${lbDropInRound}M${pos}`;

                slots.push({
                    slotId: `UB-R${r}M${pos}`,
                    roundNumber: r,
                    position: pos,
                    nextSlotId,
                    loserNextSlotId,
                    status: BracketSlotStatus.PENDING,
                } as BracketSlot);
            }
        }

        // ── UB Final (round ubRounds) ──
        if (ubRounds >= 2) {
            slots.push({
                slotId: `UB-R${ubRounds}M1`,
                roundNumber: ubRounds,
                position: 1,
                nextSlotId: 'GF',
                loserNextSlotId: lbTotalRounds > 0 ? `LB-R${lbTotalRounds}M1` : undefined,
                status: BracketSlotStatus.PENDING,
            } as BracketSlot);
        }

        // ── Lower Bracket ──
        for (let lbR = 1; lbR <= lbTotalRounds; lbR++) {
            const matchCount = this.lbMatchCount(bracketSize, lbR);
            for (let pos = 1; pos <= matchCount; pos++) {
                const isLastLbRound = lbR === lbTotalRounds;
                const nextPos = Math.ceil(pos / 2);
                const nextSlotId = isLastLbRound ? 'GF' : `LB-R${lbR + 1}M${nextPos}`;

                slots.push({
                    slotId: `LB-R${lbR}M${pos}`,
                    roundNumber: ubRounds + lbR,
                    position: pos,
                    nextSlotId,
                    status: BracketSlotStatus.PENDING,
                } as BracketSlot);
            }
        }

        // ── Grand Final ──
        slots.push({
            slotId: 'GF',
            roundNumber: ubRounds + lbTotalRounds + 1,
            position: 1,
            status: BracketSlotStatus.PENDING,
        } as BracketSlot);
    }

    /**
     * Number of matches in lower bracket round lbR.
     * Pattern: lbR=1→n/4, lbR=2→n/4, lbR=3→n/8, lbR=4→n/8 …
     */
    private lbMatchCount(bracketSize: number, lbR: number): number {
        return Math.max(1, bracketSize / Math.pow(2, Math.ceil(lbR / 2) + 1));
    }

    // ─── Advance Winner ──────────────────────────────────────────────────────────

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

        // Propagate winner to next slot
        if (slot.nextSlotId) {
            this.assignTeamToSlot(bracket.slots, slot.nextSlotId, dto.winnerId);
        }

        // Propagate loser to lower bracket (double elimination only)
        if (slot.loserNextSlotId && dto.loserId) {
            this.assignTeamToSlot(bracket.slots, slot.loserNextSlotId, dto.loserId);
        }

        // Detect Grand Final winner = champion
        const gfSlot = bracket.slots.find(s => s.slotId === 'GF');
        const isFinished = gfSlot
            ? gfSlot.status === BracketSlotStatus.COMPLETED
            : bracket.slots.every(s => s.status === BracketSlotStatus.COMPLETED || s.status === BracketSlotStatus.BYE);

        if (isFinished) {
            bracket.status = BracketStatus.COMPLETED;
            bracket.championId = dto.winnerId;
        } else {
            bracket.status = BracketStatus.ACTIVE;
        }

        bracket.markModified('slots');
        return bracket.save();
    }

    private assignTeamToSlot(slots: BracketSlot[], slotId: string, teamId: string): void {
        const targetSlot = slots.find(s => s.slotId === slotId);
        if (!targetSlot) return;
        if (!targetSlot.team1Id) {
            targetSlot.team1Id = teamId;
        } else {
            targetSlot.team2Id = teamId;
        }
        if (targetSlot.team1Id && targetSlot.team2Id) {
            targetSlot.status = BracketSlotStatus.READY;
        }
    }

    async findAll(): Promise<Bracket[]> {
        return this.bracketModel.find().sort({ createdAt: -1 }).exec();
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
