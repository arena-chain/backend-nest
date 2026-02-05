// src/team-manager/team-manager.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TeamManagerProfile, TeamManagerProfileDocument } from './schemas/team-manager-profile.schema';

@Injectable()
export class TeamManagerService {
    constructor(
        @InjectModel(TeamManagerProfile.name) private teamManagerProfileModel: Model<TeamManagerProfileDocument>,
    ) { }

    async create(
        userId: Types.ObjectId,
        profileData: { organizationName?: string }
    ): Promise<TeamManagerProfileDocument> {
        const profile = new this.teamManagerProfileModel({
            userId,
            organizationName: profileData.organizationName,
            managedTeams: [],
        });

        return profile.save();
    }

    async findByUserId(userId: string | Types.ObjectId): Promise<TeamManagerProfileDocument> {
        const profile = await this.teamManagerProfileModel.findOne({ userId });

        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }

        return profile;
    }

    async update(
        userId: string | Types.ObjectId,
        updateData: Partial<TeamManagerProfile>
    ): Promise<TeamManagerProfileDocument> {
        const profile = await this.teamManagerProfileModel.findOneAndUpdate(
            { userId },
            updateData,
            { new: true },
        );

        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }

        return profile;
    }
}
