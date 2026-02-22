import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Round, RoundDocument, RoundStatus } from './schemas/round.schema';
import { CreateRoundDto, GenerateRoundsDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

@Injectable()
export class RoundService {
    constructor(
        @InjectModel(Round.name) private roundModel: Model<RoundDocument>,
    ) { }

    async create(dto: CreateRoundDto): Promise<Round> {
        return new this.roundModel(dto).save();
    }

    /**
     * Auto-generate N weekly rounds for a league season.
     * Each round starts on Monday and ends on Sunday of that week.
     */
    async generateRounds(dto: GenerateRoundsDto): Promise<Round[]> {
        const { seasonId, stageId, startDate, weekCount } = dto;
        const rounds: Round[] = [];

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
