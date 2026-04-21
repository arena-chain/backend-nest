import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stage, StageDocument } from './schemas/stage.schema';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StageService {
  constructor(
    @InjectModel(Stage.name) private readonly stageModel: Model<StageDocument>,
  ) {}

  async create(dto: CreateStageDto): Promise<Stage> {
    const stage = await this.stageModel.create(dto);
    return this.findOne(stage._id.toString());
  }

  async findAll(seasonId?: string, leagueId?: string): Promise<Stage[]> {
    const filter: any = {};
    if (seasonId) filter.seasonId = seasonId;
    if (leagueId) filter.leagueId = leagueId;
    return this.stageModel
      .find(filter)
      .populate('rulesetId')
      .populate('bracketId')
      .sort({ orderIndex: 1, startAt: 1 })
      .exec();
  }

  async findBySeason(seasonId: string): Promise<Stage[]> {
    return this.findAll(seasonId);
  }

  async findOne(id: string): Promise<Stage> {
    const stage = await this.stageModel
      .findById(id)
      .populate('rulesetId')
      .populate('bracketId')
      .exec();
    if (!stage) throw new NotFoundException('Stage not found.');
    return stage;
  }

  async update(id: string, dto: UpdateStageDto): Promise<Stage> {
    const stage = await this.stageModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('rulesetId')
      .populate('bracketId')
      .exec();
    if (!stage) throw new NotFoundException('Stage not found.');
    return stage;
  }

  async remove(id: string): Promise<void> {
    const result = await this.stageModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Stage not found.');
  }

  async linkBracket(stageId: string, bracketId: string): Promise<Stage> {
    return this.update(stageId, { bracketId } as UpdateStageDto);
  }

  async updateStatus(
    id: string,
    status: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED',
  ): Promise<Stage> {
    return this.update(id, { status } as UpdateStageDto);
  }
}
