import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Round, RoundDocument, RoundStatus } from './schemas/round.schema';
import { Season, SeasonDocument } from '../season/schemas/season.schema';
import { SeasonTeamStatus } from '../league-registration/schemas/season-team.schema';
import { CreateRoundDto, GenerateRoundsDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { MatchService } from '../match/match.service';
import { LeagueRegistrationService } from '../league-registration/league-registration.service';
import { StandingsService } from '../standings/standings.service';
import { StageType } from '../stage/schemas/stage.schema';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RoundService {
    constructor(
        @InjectModel(Round.name) private roundModel: Model<RoundDocument>,
        @InjectModel(Season.name) private seasonModel: Model<SeasonDocument>,
        private readonly matchService: MatchService,
        private readonly registrationService: LeagueRegistrationService,
        private readonly standingsService: StandingsService,
    ) { }

    async create(dto: CreateRoundDto): Promise<Round> {
        return new this.roundModel(dto).save();
    }

    /**
     * Auto-generate weekly rounds for a season.
     * Start/end dates are derived from the Season's startDate and endDate.
     * Each round is one week; round count is from season span or optionally overridden by weekCount.
     * If generateMatches is true, creates round-robin scheduled matches from registered teams.
     */
    async generateRounds(dto: GenerateRoundsDto): Promise<Round[]> {
        const { seasonId, stageId, weekCount: requestedWeekCount, generateMatches } = dto;

        const season = await this.seasonModel.findById(seasonId).exec();
        if (!season) throw new NotFoundException(`Season ${seasonId} not found`);

        const startDate = new Date(season.startDate);
        const endDate = new Date(season.endDate);

        const seasonDurationMs = endDate.getTime() - startDate.getTime();
        const weekCount =
            requestedWeekCount ??
            Math.max(1, Math.ceil(seasonDurationMs / MS_PER_WEEK));

        const rounds: Round[] = [];
        const isSwiss = dto.stageType === StageType.SWISS;
        let roundRobinRounds: Array<Array<{ team1Id: string; team2Id: string }>> = [];

        if (generateMatches) {
            const teams = await this.registrationService.findBySeason(seasonId);
            const activeTeams = teams.filter((t) => t.status === SeasonTeamStatus.ACTIVE);
            const teamIds = activeTeams.map((t) => t.teamId);

            if (teamIds.length < 2) {
                throw new BadRequestException(
                    'generateMatches requires at least 2 ACTIVE teams registered for the season',
                );
            }
            if (!season.rulesId) {
                throw new BadRequestException(
                    'generateMatches requires the season to have a rulesId (attach a rule first)',
                );
            }

            if (!isSwiss) {
                roundRobinRounds = this.computeRoundRobinPairings(teamIds);
            }
        }

        for (let i = 0; i < weekCount; i++) {
            const roundStart = new Date(startDate);
            roundStart.setDate(roundStart.getDate() + i * 7);

            const roundEnd = new Date(roundStart);
            roundEnd.setDate(roundEnd.getDate() + 6);

            const round = await new this.roundModel({
                seasonId,
                ...(stageId && { stageId }),
                roundNumber: i + 1,
                startDate: roundStart,
                endDate: roundEnd,
                status: RoundStatus.SCHEDULED,
            }).save();

            rounds.push(round);

            if (generateMatches) {
                let pairings: Array<{ team1Id: string; team2Id: string }>;

                if (isSwiss) {
                    const swissRound = (dto.swissRoundNumber ?? 1) + i;
                    pairings = await this.computeSwissPairings(seasonId, stageId, swissRound);
                } else {
                    pairings = i < roundRobinRounds.length ? roundRobinRounds[i] : [];
                }

                if (pairings.length > 0) {
                    await this.matchService.createScheduledFromPairings(
                        round._id.toString(),
                        seasonId,
                        pairings,
                        roundStart,
                    );
                }
            }
        }

        return rounds;
    }

    /**
     * Swiss pairing (Monrad/Dutch system).
     * Groups teams by their current W-L record (from standings), then pairs
     * adjacent teams within each group. Avoids rematches by checking existing matches.
     * Teams with no prior standings start at 0-0 and are paired by registration seed.
     */
    private async computeSwissPairings(
        seasonId: string,
        stageId?: string,
        roundNumber?: number,
    ): Promise<Array<{ team1Id: string; team2Id: string }>> {
        const standings = await this.standingsService.findBySeason(seasonId, stageId);

        // Sort by points desc, then wins desc (standard Swiss ordering)
        const sorted = [...standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.wins - a.wins;
        });

        // Gather already-played team pairs to avoid rematches
        const playedPairs = new Set<string>();
        const existingMatches = await this.matchService.findBySeason(seasonId);
        for (const m of existingMatches as any[]) {
            const key = [m.team1Id, m.team2Id].sort().join('|');
            playedPairs.add(key);
        }

        const pairings: Array<{ team1Id: string; team2Id: string }> = [];
        const paired = new Set<string>();

        for (let i = 0; i < sorted.length; i++) {
            const a = String(sorted[i].teamId);
            if (paired.has(a)) continue;

            // Find closest unpaired opponent that hasn't been faced yet
            for (let j = i + 1; j < sorted.length; j++) {
                const b = String(sorted[j].teamId);
                if (paired.has(b)) continue;

                const pairKey = [a, b].sort().join('|');
                if (!playedPairs.has(pairKey)) {
                    pairings.push({ team1Id: a, team2Id: b });
                    paired.add(a);
                    paired.add(b);
                    break;
                }
            }
        }

        return pairings;
    }

    /**
     * Round-robin (circle method): N teams → (N-1) rounds.
     * Even N: N/2 matches per round. Odd N: add bye, (N-1)/2 matches per round.
     * Returns pairings per round: [[{team1Id, team2Id}, ...], ...]
     */
    private computeRoundRobinPairings(
        teamIds: string[],
    ): Array<Array<{ team1Id: string; team2Id: string }>> {
        const BYE = '__BYE__';
        let ids = [...teamIds];
        if (ids.length % 2 === 1) ids.push(BYE);

        const n = ids.length;
        if (n < 2) return [];

        let rest = ids.slice(1);
        const pivot = ids[0];
        const rounds: Array<Array<{ team1Id: string; team2Id: string }>> = [];

        for (let r = 0; r < n - 1; r++) {
            const pairings: Array<{ team1Id: string; team2Id: string }> = [];
            if (rest[0] !== BYE && pivot !== BYE) {
                pairings.push({ team1Id: pivot, team2Id: rest[0] });
            }
            for (let i = 1; i < n / 2; i++) {
                const a = rest[i];
                const b = rest[n - 1 - i];
                if (a !== BYE && b !== BYE) {
                    pairings.push({ team1Id: a, team2Id: b });
                }
            }
            rounds.push(pairings);
            rest = [rest[0], rest[rest.length - 1], ...rest.slice(1, -1)];
        }

        return rounds;
    }

    async findByLeague(leagueId: string): Promise<Round[]> {
        return this.roundModel.find({ seasonId: leagueId }).sort({ roundNumber: 1 }).exec();
    }

    async findBySeason(seasonId: string, stageId?: string): Promise<Round[]> {
        const filter: any = { seasonId };
        if (stageId) filter.stageId = stageId;
        return this.roundModel.find(filter).sort({ roundNumber: 1 }).exec();
    }

    async findByStage(stageId: string): Promise<Round[]> {
        return this.roundModel.find({ stageId }).sort({ roundNumber: 1 }).exec();
    }

    async findOne(id: string): Promise<Round> {
        const round = await this.roundModel.findById(id).exec();
        if (!round) throw new NotFoundException(`Round ${id} not found`);
        return round;
    }

    async update(id: string, dto: UpdateRoundDto): Promise<Round> {
        const updated = await this.roundModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!updated) throw new NotFoundException(`Round ${id} not found`);
        return updated;
    }

    async remove(id: string): Promise<Round> {
        const deleted = await this.roundModel.findByIdAndDelete(id).exec();
        if (!deleted) throw new NotFoundException(`Round ${id} not found`);
        return deleted;
    }
}
