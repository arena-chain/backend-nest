// src/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AdminProfile,
  AdminProfileDocument,
} from './schemas/admin-profile.schema';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user/user.service';
import { UserRole } from '../common/enums/role.enum';
import { CreateCheckInAgentDto } from './dto/create-check-in-agent.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminProfile.name)
    private adminProfileModel: Model<AdminProfileDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createCheckInAgent(dto: CreateCheckInAgentDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.usersService.create({
      email: dto.email,
      password: passwordHash,
      nickname: dto.nickname,
      role: UserRole.CHECK_IN_AGENT,
      region: dto.region,
      country: dto.country,
    });

    await this.usersService.update(created._id.toString(), {
      isEmailVerified: true,
      isActive: true,
    });

    return {
      id: created._id,
      email: created.email,
      nickname: created.nickname,
      role: created.role,
      region: created.region,
      country: created.country,
      isEmailVerified: true,
      isActive: true,
    };
  }

  async create(
    userId: Types.ObjectId,
    profileData: { adminLevel?: number; permissions?: string[] },
  ): Promise<AdminProfileDocument> {
    const profile = new this.adminProfileModel({
      userId,
      adminLevel: profileData.adminLevel || 1,
      permissions: profileData.permissions || [],
    });

    return profile.save();
  }

  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<AdminProfileDocument> {
    const profile = await this.adminProfileModel.findOne({ userId });

    if (!profile) {
      throw new NotFoundException('Admin profile not found');
    }

    return profile;
  }

  async update(
    userId: string | Types.ObjectId,
    updateData: Partial<AdminProfile>,
  ): Promise<AdminProfileDocument> {
    const profile = await this.adminProfileModel.findOneAndUpdate(
      { userId },
      updateData,
      { new: true },
    );

    if (!profile) {
      throw new NotFoundException('Admin profile not found');
    }

    return profile;
  }

  async findAll(): Promise<AdminProfileDocument[]> {
    return this.adminProfileModel.find().populate('userId').exec();
  }
}
