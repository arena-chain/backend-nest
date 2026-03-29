// src/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminProfile, AdminProfileDocument } from './schemas/admin-profile.schema';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(AdminProfile.name) private adminProfileModel: Model<AdminProfileDocument>,
    ) { }

    async create(
        userId: Types.ObjectId,
        profileData: { adminLevel?: number; permissions?: string[] }
    ): Promise<AdminProfileDocument> {
        const profile = new this.adminProfileModel({
            userId,
            adminLevel: profileData.adminLevel || 1,
            permissions: profileData.permissions || [],
        });

        return profile.save();
    }

    async findByUserId(userId: string | Types.ObjectId): Promise<AdminProfileDocument> {
        const profile = await this.adminProfileModel.findOne({ userId });

        if (!profile) {
            throw new NotFoundException('Admin profile not found');
        }

        return profile;
    }

    async update(
        userId: string | Types.ObjectId,
        updateData: Partial<AdminProfile>
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
