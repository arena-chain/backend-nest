// src/team-manager/team-manager.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TeamManagerProfile, TeamManagerProfileDocument } from './schemas/team-manager-profile.schema';

import { Team, TeamDocument } from '../team/schemas/team.schema'; // Verify path
import { TeamService } from '../team/team.service';

@Injectable()
export class TeamManagerService {
    constructor(
        @InjectModel(TeamManagerProfile.name) private teamManagerProfileModel: Model<TeamManagerProfileDocument>,
        @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    ) { }

    async create(
        userId: Types.ObjectId,
        profileData: {
            organizationName?: string;
            teamId: string;
            firstName?: string;
            lastName?: string;
            cin?: string;
            age?: number;
            gender?: string;
            description?: string;
            phoneNumber?: string;
        },
    ): Promise<TeamManagerProfileDocument> {
        const profile = new this.teamManagerProfileModel({
            userId,
            organizationName: profileData.organizationName,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            cin: profileData.cin,
            age: profileData.age,
            gender: profileData.gender,
            description: profileData.description,
            phoneNumber: profileData.phoneNumber,
            team: new Types.ObjectId(profileData.teamId),
            status: 'pending',
            isVerified: false,
            managedTeams: [],
        });

        return profile.save();
    }

    async findByUserId(userId: string | Types.ObjectId): Promise<TeamManagerProfileDocument> {
        // Convert to ObjectId if string
        const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        const profile = await this.teamManagerProfileModel.findOne({ userId: userObjectId });

        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }

        return profile;
    }

    async update(
        userId: string | Types.ObjectId,
        updateData: Partial<TeamManagerProfile>
    ): Promise<TeamManagerProfileDocument> {
        // Convert to ObjectId if string
        const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        const profile = await this.teamManagerProfileModel.findOneAndUpdate(
            { userId: userObjectId },
            updateData,
            { new: true },
        );

        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }

        return profile;
    }

    async findPending(): Promise<TeamManagerProfileDocument[]> {
        return this.teamManagerProfileModel.find({ status: 'pending' })
            .populate('userId')
            .populate('team') // Populate team details
            .exec();
    }

    async approve(userId: string): Promise<TeamManagerProfileDocument> {
        // Update Profile first - convert string userId to ObjectId
        const profile = await this.teamManagerProfileModel.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { status: 'approved', isVerified: true },
            { new: true }
        );

        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }

        // Update Team to link the approved manager
        await this.teamModel.findByIdAndUpdate(
            profile.team,
            { teamManager: profile._id, isVerified: true }
        );

        return profile;
    }

    async reject(userId: string): Promise<TeamManagerProfileDocument> {
        // Convert string userId to ObjectId
        const profile = await this.teamManagerProfileModel.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { status: 'rejected', isVerified: false },
            { new: true }
        );
        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }
        return profile;
    }

    async findAll(): Promise<TeamManagerProfileDocument[]> {
        return this.teamManagerProfileModel.find().populate('userId').populate('team').exec();
    }
}
