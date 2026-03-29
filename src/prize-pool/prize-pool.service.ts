import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrizePool, PrizePoolDocument, PrizeStatus } from './schemas/prize-pool.schema';
import { CreatePrizePoolDto } from './dto/create-prize-pool.dto';
import { UpdatePrizePoolDto } from './dto/update-prize-pool.dto';

@Injectable()
export class PrizePoolService {
    constructor(
        @InjectModel(PrizePool.name) private readonly prizePoolModel: Model<PrizePoolDocument>,
    ) {}

    async create(dto: CreatePrizePoolDto): Promise<PrizePool> {
        const existing = await this.prizePoolModel.findOne({ seasonId: dto.seasonId });
        if (existing) {
            throw new ConflictException('A prize pool already exists for this season.');
        }
        return this.prizePoolModel.create(dto);
    }

    async findBySeason(seasonId: string): Promise<PrizePool | null> {
        return this.prizePoolModel
            .findOne({ seasonId })
            .populate('sponsorId')
            .exec();
    }

    async findByLeague(leagueId: string): Promise<PrizePool[]> {
        return this.prizePoolModel
            .find({ leagueId })
            .populate('sponsorId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findOne(id: string): Promise<PrizePool> {
        const pool = await this.prizePoolModel.findById(id).populate('sponsorId').exec();
        if (!pool) throw new NotFoundException('Prize pool not found.');
        return pool;
    }

    async update(id: string, dto: UpdatePrizePoolDto): Promise<PrizePool> {
        const pool = await this.prizePoolModel
            .findByIdAndUpdate(id, dto, { new: true })
            .populate('sponsorId')
            .exec();
        if (!pool) throw new NotFoundException('Prize pool not found.');
        return pool;
    }

    async markDistributed(id: string): Promise<PrizePool> {
        const pool = await this.prizePoolModel
            .findByIdAndUpdate(id, { status: PrizeStatus.DISTRIBUTED }, { new: true })
            .exec();
        if (!pool) throw new NotFoundException('Prize pool not found.');
        return pool;
    }

    async remove(id: string): Promise<void> {
        const result = await this.prizePoolModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException('Prize pool not found.');
    }
}
