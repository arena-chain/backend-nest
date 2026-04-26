import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument } from './schemas/group.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { StandingsService } from '../standings/standings.service';

@Injectable()
export class GroupService {
    constructor(
        @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
        private readonly standingsService: StandingsService,
    ) {}

    async create(dto: CreateGroupDto): Promise<Group> {
        const existing = await this.groupModel.findOne({
            stageId: dto.stageId,
            groupIndex: dto.groupIndex ?? 0,
        });
        if (existing) throw new ConflictException(`A group with index ${dto.groupIndex ?? 0} already exists in this stage.`);

        const group = await this.groupModel.create({
            ...dto,
            teamIds: dto.teamIds ?? [],
            advancementCount: dto.advancementCount ?? 1,
            groupIndex: dto.groupIndex ?? 0,
        });

        // Auto-init standings rows for all pre-assigned teams
        for (const teamId of group.teamIds) {
            await this.standingsService.initTeamStandings(
                group.seasonId,
                teamId,
                group.stageId,
                group._id.toString(),
            );
        }

        return group;
    }

    async findByStage(stageId: string): Promise<Group[]> {
        return this.groupModel.find({ stageId }).sort({ groupIndex: 1 }).exec();
    }

    async findBySeason(seasonId: string): Promise<Group[]> {
        return this.groupModel.find({ seasonId }).sort({ groupIndex: 1 }).exec();
    }

    async findOne(id: string): Promise<Group> {
        const group = await this.groupModel.findById(id).exec();
        if (!group) throw new NotFoundException(`Group ${id} not found`);
        return group;
    }

    async update(id: string, dto: UpdateGroupDto): Promise<Group> {
        const updated = await this.groupModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!updated) throw new NotFoundException(`Group ${id} not found`);
        return updated;
    }

    async addTeam(id: string, teamId: string): Promise<Group> {
        const group = await this.groupModel.findById(id).exec();
        if (!group) throw new NotFoundException(`Group ${id} not found`);
        if (group.teamIds.includes(teamId)) throw new ConflictException('Team is already in this group.');

        group.teamIds.push(teamId);
        await group.save();

        await this.standingsService.initTeamStandings(
            group.seasonId,
            teamId,
            group.stageId,
            id,
        );

        return group;
    }

    async removeTeam(id: string, teamId: string): Promise<Group> {
        const group = await this.groupModel.findById(id).exec();
        if (!group) throw new NotFoundException(`Group ${id} not found`);

        group.teamIds = group.teamIds.filter(t => t !== teamId);
        return group.save();
    }

    async bulkAssignTeams(id: string, teamIds: string[]): Promise<Group> {
        const group = await this.groupModel.findById(id).exec();
        if (!group) throw new NotFoundException(`Group ${id} not found`);

        group.teamIds = teamIds;
        await group.save();

        for (const teamId of teamIds) {
            await this.standingsService.initTeamStandings(
                group.seasonId,
                teamId,
                group.stageId,
                id,
            );
        }

        return group;
    }

    async remove(id: string): Promise<void> {
        const result = await this.groupModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException(`Group ${id} not found`);
    }
}
