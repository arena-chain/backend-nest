import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Season, SeasonDocument, SeasonStatus } from './schemas/season.schema';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';

@Injectable()
export class SeasonService {
  constructor(
    @InjectModel(Season.name) private seasonModel: Model<SeasonDocument>,
  ) {}

  async create(dto: CreateSeasonDto): Promise<Season> {
    return new this.seasonModel(dto).save();
  }

  async findAll(): Promise<Season[]> {
    return this.seasonModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByLeague(leagueId: string): Promise<Season[]> {
    return this.seasonModel.find({ leagueId }).sort({ startDate: -1 }).exec();
  }

  async findOne(id: string): Promise<Season> {
    const season = await this.seasonModel.findById(id).exec();
    if (!season) throw new NotFoundException(`Season ${id} not found`);
    return season;
  }

  async update(id: string, dto: UpdateSeasonDto): Promise<Season> {
    const updated = await this.seasonModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Season ${id} not found`);
    return updated;
  }

  async activate(id: string): Promise<Season> {
    const updated = await this.seasonModel
      .findByIdAndUpdate(id, { status: SeasonStatus.ONGOING }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Season ${id} not found`);
    return updated;
  }

  async close(id: string): Promise<Season> {
    const updated = await this.seasonModel
      .findByIdAndUpdate(id, { status: SeasonStatus.FINISHED }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Season ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<Season> {
    const deleted = await this.seasonModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Season ${id} not found`);
    return deleted;
  }
}
