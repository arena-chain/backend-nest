import {
    Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CheckIn, CheckInDocument, CheckInStatus } from './schemas/check-in.schema';
import { CreateCheckInDto } from './dto/create-check-in.dto';

@Injectable()
export class CheckInService {
    constructor(
        @InjectModel(CheckIn.name) private readonly checkInModel: Model<CheckInDocument>,
    ) {}

    async createForMatch(dto: CreateCheckInDto): Promise<CheckIn> {
        const existing = await this.checkInModel.findOne({ matchId: dto.matchId });
        if (existing) throw new ConflictException('Check-in already exists for this match.');
        return this.checkInModel.create(dto);
    }

    async checkIn(matchId: string, teamId: string, team1Id: string): Promise<CheckIn> {
        const record = await this.checkInModel.findOne({ matchId });
        if (!record) throw new NotFoundException('Check-in record not found.');
        if (record.status !== CheckInStatus.OPEN) {
            throw new BadRequestException('Check-in window is not open.');
        }
        if (new Date() > record.deadline) {
            throw new BadRequestException('Check-in deadline has passed.');
        }

        const isTeam1 = teamId === team1Id;
        if (isTeam1) {
            if (record.team1CheckedIn) throw new ConflictException('Team 1 already checked in.');
            record.team1CheckedIn = true;
            record.team1CheckedInAt = new Date();
        } else {
            if (record.team2CheckedIn) throw new ConflictException('Team 2 already checked in.');
            record.team2CheckedIn = true;
            record.team2CheckedInAt = new Date();
        }

        if (record.team1CheckedIn && record.team2CheckedIn) {
            record.status = CheckInStatus.BOTH_READY;
        }

        return record.save();
    }

    /**
     * Called by a cron job or admin after deadline expires.
     * Marks which team(s) missed check-in.
     */
    async processExpiredCheckIns(): Promise<number> {
        const now = new Date();
        const expired = await this.checkInModel.find({
            status: CheckInStatus.OPEN,
            deadline: { $lt: now },
        });

        let processed = 0;
        for (const record of expired) {
            if (!record.team1CheckedIn) {
                record.status = CheckInStatus.TEAM1_MISSED;
            } else if (!record.team2CheckedIn) {
                record.status = CheckInStatus.TEAM2_MISSED;
            }
            await record.save();
            processed++;
        }
        return processed;
    }

    async findByMatch(matchId: string): Promise<CheckIn | null> {
        return this.checkInModel.findOne({ matchId }).exec();
    }

    async findBySeason(seasonId: string): Promise<CheckIn[]> {
        return this.checkInModel.find({ seasonId }).sort({ deadline: 1 }).exec();
    }

    async cancel(matchId: string): Promise<CheckIn> {
        const record = await this.checkInModel
            .findOneAndUpdate({ matchId }, { status: CheckInStatus.CANCELLED }, { new: true })
            .exec();
        if (!record) throw new NotFoundException('Check-in record not found.');
        return record;
    }
}
