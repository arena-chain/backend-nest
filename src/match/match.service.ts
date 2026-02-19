import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument, MatchStatus } from './schemas/match.schema';
import { LeagueRule, LeagueRuleDocument } from '../league-rule/schemas/league-rule.schema';
import { SeasonService } from '../season/season.service';
import { StandingsService } from '../standings/standings.service';
import { LeagueRegistrationService } from '../league-registration/league-registration.service';
import { EloService } from './elo.service';
import {
    AddGameResultDto,
    CreateMatchDto,
    DeclareForfeitDto,
    SubmitFullResultDto,
} from './dto/match.dto';

@Injectable()
export class MatchService {
    constructor(
        @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
        @InjectModel(LeagueRule.name) private readonly leagueRuleModel: Model<LeagueRuleDocument>,
        private readonly seasonService: SeasonService,
        private readonly standingsService: StandingsService,
        private readonly registrationService: LeagueRegistrationService,
        private readonly eloService: EloService,
    ) {}

    async create(dto: CreateMatchDto): Promise<Match> {
        const season = await this.seasonService.findOne(dto.seasonId);
        const rule = await this.leagueRuleModel.findById(season.rulesId).exec();
        if (!rule) {
            throw new BadRequestException(
                `No LeagueRule found for rulesId ${season.rulesId}. Attach a rule to this season first.`,
            );
        }

        const match = new this.matchModel({
            ...dto,
            format: rule.matchType,
            status: MatchStatus.SCHEDULED,
            games: [],
            team1GamesWon: 0,
            team2GamesWon: 0,
        });

        return match.save();
    }

    async addGameResult(matchId: string, dto: AddGameResultDto): Promise<Match> {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) throw new NotFoundException(`Match ${matchId} not found`);

        if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.FORFEIT) {
            throw new BadRequestException('Match is already completed or forfeited');
        }
        if (match.status === MatchStatus.CANCELLED) {
            throw new BadRequestException('Match is cancelled');
        }
        if (dto.winnerId !== match.team1Id && dto.winnerId !== match.team2Id) {
            throw new BadRequestException('winnerId must be team1Id or team2Id');
        }

        match.games.push(dto);
        match.status = MatchStatus.ONGOING;

        if (dto.winnerId === match.team1Id) {
            match.team1GamesWon += 1;
        } else {
            match.team2GamesWon += 1;
        }

        const winsNeeded = this.eloService.winsNeededForFormat(match.format as 'BO1' | 'BO3' | 'BO5');
        const seriesOver = match.team1GamesWon >= winsNeeded || match.team2GamesWon >= winsNeeded;

        if (seriesOver) {
            const winnerId = match.team1GamesWon >= winsNeeded ? match.team1Id : match.team2Id;
            const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;
            const winnerGamesWon = winnerId === match.team1Id ? match.team1GamesWon : match.team2GamesWon;
            const loserGamesWon = winnerId === match.team1Id ? match.team2GamesWon : match.team1GamesWon;

            match.status = MatchStatus.COMPLETED;
            match.winnerId = winnerId;
            match.loserId = loserId;

            await match.save();
            await this.applyPointsUpdate(match.seasonId, winnerId, loserId, winnerGamesWon, loserGamesWon);
        } else {
            await match.save();
        }

        return match;
    }

    async submitFullResult(matchId: string, dto: SubmitFullResultDto): Promise<Match> {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) throw new NotFoundException(`Match ${matchId} not found`);

        if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.FORFEIT) {
            throw new BadRequestException('Match is already completed');
        }

        const winsNeeded = this.eloService.winsNeededForFormat(match.format as 'BO1' | 'BO3' | 'BO5');

        if (dto.team1GamesWon < winsNeeded && dto.team2GamesWon < winsNeeded) {
            throw new BadRequestException(
                `Invalid result: one team must have at least ${winsNeeded} wins for ${match.format}`,
            );
        }

        match.team1GamesWon = dto.team1GamesWon;
        match.team2GamesWon = dto.team2GamesWon;
        match.status = MatchStatus.COMPLETED;

        const winnerId = dto.team1GamesWon >= winsNeeded ? match.team1Id : match.team2Id;
        const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;
        const winnerGamesWon = winnerId === match.team1Id ? dto.team1GamesWon : dto.team2GamesWon;
        const loserGamesWon = winnerId === match.team1Id ? dto.team2GamesWon : dto.team1GamesWon;

        match.winnerId = winnerId;
        match.loserId = loserId;
        await match.save();
        await this.applyPointsUpdate(match.seasonId, winnerId, loserId, winnerGamesWon, loserGamesWon);

        return match;
    }

    async declareForfeit(matchId: string, dto: DeclareForfeitDto): Promise<Match> {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) throw new NotFoundException(`Match ${matchId} not found`);

        if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.FORFEIT) {
            throw new BadRequestException('Match is already completed or forfeited');
        }
        if (dto.forfeitingTeamId !== match.team1Id && dto.forfeitingTeamId !== match.team2Id) {
            throw new BadRequestException('forfeitingTeamId must be team1Id or team2Id');
        }

        const winnerId = dto.forfeitingTeamId === match.team1Id ? match.team2Id : match.team1Id;

        match.status = MatchStatus.FORFEIT;
        match.forfeitingTeamId = dto.forfeitingTeamId;
        match.forfeitReason = dto.forfeitReason;
        match.winnerId = winnerId;
        match.loserId = dto.forfeitingTeamId;

        await match.save();

        const season = await this.seasonService.findOne(match.seasonId);
        const rule = await this.leagueRuleModel.findById(season.rulesId).exec();

        const newForfeitCount = await this.standingsService.updateAfterForfeit(
            match.seasonId,
            winnerId,
            dto.forfeitingTeamId,
            rule?.pointsWin ?? 3,
            rule?.forfeitCountsAsLoss ?? true,
        );

        // Auto-disqualify if forfeit threshold reached
        const maxForfeits = rule?.maxForfeitsBeforeDisqualification ?? 3;
        if (newForfeitCount >= maxForfeits) {
            await this.registrationService.disqualifyBySeasonAndTeam(
                match.seasonId,
                dto.forfeitingTeamId,
            );
        }

        return match;
    }

    async cancel(matchId: string): Promise<Match> {
        const match = await this.matchModel.findByIdAndUpdate(
            matchId,
            { status: MatchStatus.CANCELLED },
            { new: true },
        ).exec();
        if (!match) throw new NotFoundException(`Match ${matchId} not found`);
        return match;
    }

    async findByRound(roundId: string): Promise<Match[]> {
        return this.matchModel.find({ roundId }).sort({ scheduledStart: 1 }).exec();
    }

    async findBySeason(seasonId: string): Promise<Match[]> {
        return this.matchModel.find({ seasonId }).sort({ scheduledStart: 1 }).exec();
    }

    async findOne(id: string): Promise<Match> {
        const match = await this.matchModel.findById(id).exec();
        if (!match) throw new NotFoundException(`Match ${id} not found`);
        return match;
    }

    async update(id: string, dto: Partial<CreateMatchDto>): Promise<Match> {
        const updated = await this.matchModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!updated) throw new NotFoundException(`Match ${id} not found`);
        return updated;
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private async applyPointsUpdate(
        seasonId: string,
        winnerId: string,
        loserId: string,
        winnerGamesWon: number,
        loserGamesWon: number,
    ): Promise<void> {
        const season = await this.seasonService.findOne(seasonId);
        const rule = await this.leagueRuleModel.findById(season.rulesId).exec();

        await this.standingsService.updateAfterMatch(
            seasonId,
            winnerId,
            loserId,
            winnerGamesWon,
            loserGamesWon,
            rule?.pointsWin ?? 3,
            rule?.pointsLoss ?? 0,
        );
    }
}
