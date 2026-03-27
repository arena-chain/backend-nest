import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { Mission, MissionDocument } from './schemas/mission.schema';

@Injectable()
export class MissionService {
  constructor(
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
  ) { }

  async create(createMissionDto: CreateMissionDto): Promise<Mission> {
    const createdMission = new this.missionModel(createMissionDto);
    return createdMission.save();
  }

  async findAll(): Promise<Mission[]> {
    return this.missionModel.find().exec();
  }

  async findOne(id: string): Promise<Mission> {
    const mission = await this.missionModel.findById(id).exec();
    if (!mission) {
      throw new NotFoundException(`Mission with ID ${id} not found`);
    }
    return mission;
  }

  async update(id: string, updateMissionDto: UpdateMissionDto): Promise<Mission> {
    const updatedMission = await this.missionModel
      .findByIdAndUpdate(id, updateMissionDto, { new: true })
      .exec();
    if (!updatedMission) {
      throw new NotFoundException(`Mission with ID ${id} not found`);
    }
    return updatedMission;
  }

  async remove(id: string): Promise<Mission> {
    const deletedMission = await this.missionModel.findByIdAndDelete(id).exec();
    if (!deletedMission) {
      throw new NotFoundException(`Mission with ID ${id} not found`);
    }
    return deletedMission;
  }
}
