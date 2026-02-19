import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeagueRule, LeagueRuleDocument } from './schemas/league-rule.schema';
import { CreateLeagueRuleDto } from './dto/create-league-rule.dto';
import { UpdateLeagueRuleDto } from './dto/update-league-rule.dto';

@Injectable()
export class LeagueRuleService {
    constructor(
        @InjectModel(LeagueRule.name) private readonly leagueRuleModel: Model<LeagueRuleDocument>,
    ) {}

    async create(dto: CreateLeagueRuleDto): Promise<LeagueRule> {
        const rule = await new this.leagueRuleModel(dto).save();
        return rule.populate('gameId');
    }

    async findByGame(gameId: string): Promise<LeagueRule[]> {
        return this.leagueRuleModel
            .find({ gameId })
            .populate('gameId')
            .exec();
    }

    async findAll(): Promise<LeagueRule[]> {
        return this.leagueRuleModel.find().populate('gameId').exec();
    }

    async findOne(id: string): Promise<LeagueRule> {
        const rule = await this.leagueRuleModel.findById(id).populate('gameId').exec();
        if (!rule) throw new NotFoundException(`LeagueRule ${id} not found`);
        return rule;
    }

    async update(id: string, dto: UpdateLeagueRuleDto): Promise<LeagueRule> {
        const updated = await this.leagueRuleModel
            .findByIdAndUpdate(id, dto, { new: true })
            .populate('gameId')
            .exec();
        if (!updated) throw new NotFoundException(`LeagueRule ${id} not found`);
        return updated;
    }

    async remove(id: string): Promise<LeagueRule> {
        const deleted = await this.leagueRuleModel.findByIdAndDelete(id).exec();
        if (!deleted) throw new NotFoundException(`LeagueRule ${id} not found`);
        return deleted;
    }
}
