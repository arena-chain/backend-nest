import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamService {
    constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) { }

    async create(createTeamDto: CreateTeamDto): Promise<Team> {
        const createdTeam = new this.teamModel(createTeamDto);
        return createdTeam.save();
    }

    async findAll(): Promise<Team[]> {
        return this.teamModel.find().populate('teamManager').exec();
    }

    async findOne(id: string): Promise<Team> {
        const team = await this.teamModel.findById(id).populate('teamManager').populate('members').exec();
        if (!team) {
            throw new NotFoundException(`Team with ID ${id} not found`);
        }
        return team;
    }

    async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
        const updatedTeam = await this.teamModel
            .findByIdAndUpdate(id, updateTeamDto, { new: true })
            .exec();
        if (!updatedTeam) {
            throw new NotFoundException(`Team with ID ${id} not found`);
        }
        return updatedTeam;
    }

    async remove(id: string): Promise<void> {
        const result = await this.teamModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Team with ID ${id} not found`);
        }
    }
}
