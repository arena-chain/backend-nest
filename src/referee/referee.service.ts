// src/referee/referee.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RefereeProfile,
  RefereeProfileDocument,
} from './schemas/referee-profile.schema';

@Injectable()
export class RefereeService {
  constructor(
    @InjectModel(RefereeProfile.name)
    private refereeProfileModel: Model<RefereeProfileDocument>,
  ) {}

  async create(
    userId: Types.ObjectId,
    profileData: { level?: string },
  ): Promise<RefereeProfileDocument> {
    const profile = new this.refereeProfileModel({
      userId,
      level: profileData.level || 'Junior',
      rating: 0,
      assignedMatches: [],
    });

    return profile.save();
  }

  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<RefereeProfileDocument> {
    const profile = await this.refereeProfileModel.findOne({ userId });

    if (!profile) {
      throw new NotFoundException('Referee profile not found');
    }

    return profile;
  }

  async update(
    userId: string | Types.ObjectId,
    updateData: Partial<RefereeProfile>,
  ): Promise<RefereeProfileDocument> {
    const profile = await this.refereeProfileModel.findOneAndUpdate(
      { userId },
      updateData,
      { new: true },
    );

    if (!profile) {
      throw new NotFoundException('Referee profile not found');
    }

    return profile;
  }

  async findAll(): Promise<RefereeProfileDocument[]> {
    return this.refereeProfileModel.find().populate('userId').exec();
  }
}
