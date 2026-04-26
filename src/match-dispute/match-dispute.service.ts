import {
    Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    MatchDispute, MatchDisputeDocument, DisputeStatus,
} from './schemas/match-dispute.schema';
import { CreateMatchDisputeDto, ResolveDisputeDto } from './dto/create-match-dispute.dto';

@Injectable()
export class MatchDisputeService {
    constructor(
        @InjectModel(MatchDispute.name) private readonly disputeModel: Model<MatchDisputeDocument>,
    ) {}

    async submit(dto: CreateMatchDisputeDto): Promise<MatchDispute> {
        const existing = await this.disputeModel.findOne({
            matchId: dto.matchId,
            submittedByTeamId: dto.submittedByTeamId,
            status: { $in: [DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW] },
        });
        if (existing) {
            throw new ConflictException('An open dispute already exists for this match by your team.');
        }
        return this.disputeModel.create(dto);
    }

    async findByMatch(matchId: string): Promise<MatchDispute[]> {
        return this.disputeModel.find({ matchId }).sort({ createdAt: -1 }).exec();
    }

    async findBySeason(seasonId: string, status?: DisputeStatus): Promise<MatchDispute[]> {
        const filter: any = { seasonId };
        if (status) filter.status = status;
        return this.disputeModel.find(filter).sort({ createdAt: -1 }).exec();
    }

    async findPending(): Promise<MatchDispute[]> {
        return this.disputeModel
            .find({ status: { $in: [DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW] } })
            .sort({ createdAt: 1 })
            .exec();
    }

    async findOne(id: string): Promise<MatchDispute> {
        const dispute = await this.disputeModel.findById(id).exec();
        if (!dispute) throw new NotFoundException('Dispute not found.');
        return dispute;
    }

    async markUnderReview(id: string): Promise<MatchDispute> {
        const dispute = await this.disputeModel.findById(id);
        if (!dispute) throw new NotFoundException('Dispute not found.');
        if (dispute.status !== DisputeStatus.PENDING) {
            throw new BadRequestException('Only PENDING disputes can be moved to UNDER_REVIEW.');
        }
        dispute.status = DisputeStatus.UNDER_REVIEW;
        return dispute.save();
    }

    async resolve(id: string, dto: ResolveDisputeDto): Promise<MatchDispute> {
        const dispute = await this.disputeModel.findById(id);
        if (!dispute) throw new NotFoundException('Dispute not found.');
        if (
            dispute.status !== DisputeStatus.PENDING &&
            dispute.status !== DisputeStatus.UNDER_REVIEW
        ) {
            throw new BadRequestException('Dispute has already been resolved.');
        }
        dispute.status = dto.verdict === 'ACCEPTED' ? DisputeStatus.ACCEPTED : DisputeStatus.REJECTED;
        dispute.adminNote = dto.adminNote;
        dispute.resolvedAt = new Date();
        dispute.resolvedByAdminId = dto.resolvedByAdminId;
        return dispute.save();
    }
}
