import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { League, LeagueDocument } from './schemas/league.schema';

@Injectable()
export class LeagueService {
  constructor(
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
  ) { }

  async create(createLeagueDto: CreateLeagueDto): Promise<League> {
    const createdLeague = await new this.leagueModel(createLeagueDto).save();
    return this.findOne(createdLeague._id.toString());
  }

  async findAll(): Promise<League[]> {
    return this.leagueModel.find().populate('organiserId').exec();
  }

  async findOne(id: string): Promise<League> {
    const league = await this.leagueModel.findById(id).populate('organiserId').exec();
    if (!league) {
      throw new NotFoundException(`League with ID ${id} not found`);
    }
    return league;
  }

  async update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    const updatedLeague = await this.leagueModel
      .findByIdAndUpdate(id, updateLeagueDto, { new: true })
      .populate('organiserId')
      .exec();
    if (!updatedLeague) {
      throw new NotFoundException(`League with ID ${id} not found`);
    }
    return updatedLeague;
  }

  async remove(id: string): Promise<League> {
    const deletedLeague = await this.leagueModel.findByIdAndDelete(id).exec();
    if (!deletedLeague) {
      throw new NotFoundException(`League with ID ${id} not found`);
    }
    return deletedLeague;
  }
}
