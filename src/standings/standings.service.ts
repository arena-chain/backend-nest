import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Standings, StandingsDocument } from './schemas/standings.schema';

@Injectable()
export class StandingsService {
    constructor(
        @InjectModel(Standings.name)
        private readonly standingsModel: Model<StandingsDocument>,
    ) {}

    async initTeamStandings(
        seasonId: string,
        teamId: string,
        stageId?: string,
        groupId?: string,
    ): Promise<Standings> {
        const filter: any = { seasonId, teamId };
        if (stageId) filter.stageId = stageId;
        if (groupId) filter.groupId = groupId;

        const existing = await this.standingsModel.findOne(filter).exec();
        if (existing) return existing;

        return new this.standingsModel({
            seasonId,
            teamId,
            ...(stageId && { stageId }),
            ...(groupId && { groupId }),
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            forfeits: 0,
            points: 0,
            scoreFor: 0,
            scoreAgainst: 0,
            gamesWon: 0,
            gamesLost: 0,
            gameDiff: 0,
            rank: 0,
        }).save();
    }

    async updateAfterMatch(
        seasonId: string,
        winnerId: string,
        loserId: string,
        winnerGamesWon: number,
        loserGamesWon: number,
        pointsWin: number,
        pointsLoss: number,
        stageId?: string,
        groupId?: string,
    ): Promise<void> {
        const winnerFilter: any = { seasonId, teamId: winnerId };
        const loserFilter: any = { seasonId, teamId: loserId };
        if (stageId) { winnerFilter.stageId = stageId; loserFilter.stageId = stageId; }
        if (groupId) { winnerFilter.groupId = groupId; loserFilter.groupId = groupId; }

        await this.standingsModel.findOneAndUpdate(
            winnerFilter,
            {
                $inc: {
                    played: 1,
                    wins: 1,
                    points: pointsWin,
                    gamesWon: winnerGamesWon,
                    gamesLost: loserGamesWon,
                    gameDiff: winnerGamesWon - loserGamesWon,
                },
            },
            { upsert: true, new: true },
        ).exec();

        await this.standingsModel.findOneAndUpdate(
            loserFilter,
            {
                $inc: {
                    played: 1,
                    losses: 1,
                    points: pointsLoss,
                    gamesWon: loserGamesWon,
                    gamesLost: winnerGamesWon,
                    gameDiff: loserGamesWon - winnerGamesWon,
                },
            },
            { upsert: true, new: true },
        ).exec();

        await this.recalculateRanks(seasonId, stageId, groupId);
    }

    async updateAfterForfeit(
        seasonId: string,
        winnerId: string,
        forfeitingTeamId: string,
        pointsWin: number,
        forfeitCountsAsLoss: boolean,
        stageId?: string,
        groupId?: string,
    ): Promise<number> {
        const winnerFilter: any = { seasonId, teamId: winnerId };
        const loserFilter: any = { seasonId, teamId: forfeitingTeamId };
        if (stageId) { winnerFilter.stageId = stageId; loserFilter.stageId = stageId; }
        if (groupId) { winnerFilter.groupId = groupId; loserFilter.groupId = groupId; }

        await this.standingsModel.findOneAndUpdate(
            winnerFilter,
            { $inc: { played: 1, wins: 1, points: pointsWin } },
            { upsert: true, new: true },
        ).exec();

        const forfeitingTeam = await this.standingsModel.findOneAndUpdate(
            loserFilter,
            {
                $inc: {
                    played: 1,
                    ...(forfeitCountsAsLoss && { losses: 1 }),
                    forfeits: 1,
                },
            },
            { upsert: true, new: true },
        ).exec();

        await this.recalculateRanks(seasonId, stageId, groupId);

        return forfeitingTeam?.forfeits ?? 1;
    }

    async recalculateRanks(seasonId: string, stageId?: string, groupId?: string): Promise<void> {
        const filter: any = { seasonId };
        if (stageId) filter.stageId = stageId;
        if (groupId) filter.groupId = groupId;

        const all = await this.standingsModel
            .find(filter)
            .sort({ points: -1, gameDiff: -1, gamesWon: -1 })
            .exec();

        const bulkOps = all.map((s, index) => ({
            updateOne: {
                filter: { _id: s._id },
                update: { $set: { rank: index + 1 } },
            },
        }));

        if (bulkOps.length > 0) {
            await this.standingsModel.bulkWrite(bulkOps);
        }
    }

    async findBySeason(seasonId: string, stageId?: string, groupId?: string): Promise<Standings[]> {
        const filter: any = { seasonId };
        if (stageId) filter.stageId = stageId;
        if (groupId) filter.groupId = groupId;
        return this.standingsModel.find(filter).sort({ rank: 1 }).exec();
    }

    async findOne(id: string): Promise<Standings> {
        const s = await this.standingsModel.findById(id).exec();
        if (!s) throw new NotFoundException(`Standings ${id} not found`);
        return s;
    }

    async remove(id: string): Promise<Standings> {
        const s = await this.standingsModel.findByIdAndDelete(id).exec();
        if (!s) throw new NotFoundException(`Standings ${id} not found`);
        return s;
    }
}
