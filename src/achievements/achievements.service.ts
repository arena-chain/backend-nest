import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { Achievement, AchievementDocument } from './schemas/achievement.schema';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectModel(Achievement.name)
    private achievementModel: Model<AchievementDocument>,
  ) {}

  async create(
    createAchievementDto: CreateAchievementDto,
  ): Promise<Achievement> {
    const createdAchievement = new this.achievementModel(createAchievementDto);
    return createdAchievement.save();
  }

  async findAll(): Promise<Achievement[]> {
    return this.achievementModel.find().exec();
  }

  async findOne(id: string): Promise<Achievement> {
    const achievement = await this.achievementModel.findById(id).exec();
    if (!achievement) {
      throw new NotFoundException(`Achievement with ID ${id} not found`);
    }
    return achievement;
  }

  async update(
    id: string,
    updateAchievementDto: UpdateAchievementDto,
  ): Promise<Achievement> {
    const updatedAchievement = await this.achievementModel
      .findByIdAndUpdate(id, updateAchievementDto, { new: true })
      .exec();
    if (!updatedAchievement) {
      throw new NotFoundException(`Achievement with ID ${id} not found`);
    }
    return updatedAchievement;
  }

  async remove(id: string): Promise<Achievement> {
    const deletedAchievement = await this.achievementModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedAchievement) {
      throw new NotFoundException(`Achievement with ID ${id} not found`);
    }
    return deletedAchievement;
  }
}
