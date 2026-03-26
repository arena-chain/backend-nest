// src/team-manager/team-manager.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TeamManagerProfile, TeamManagerProfileDocument } from './schemas/team-manager-profile.schema';
import { Team, TeamDocument } from '../team/schemas/team.schema';
import { PlayerProfile, PlayerProfileDocument } from '../player/schemas/player-profile.schema';

@Injectable()
export class TeamManagerService {
    constructor(
        @InjectModel(TeamManagerProfile.name) private teamManagerProfileModel: Model<TeamManagerProfileDocument>,
        @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
        @InjectModel(PlayerProfile.name) private playerProfileModel: Model<PlayerProfileDocument>,
    ) { }

    async create(
        userId: Types.ObjectId,
        profileData: {
            organizationName?: string;
            teamId?: string;
            firstName?: string;
            lastName?: string;
            cin?: string;
            age?: number;
            gender?: string;
            description?: string;
            phoneNumber?: string;
        }
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
            ...(profileData.teamId && { team: new Types.ObjectId(profileData.teamId) }),
            status: 'pending',
            isVerified: false,
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

    async createTeamForManager(
        userId: string,
        teamData: {
            name: string;
            organizationName?: string;
            logo?: string;
            description?: string;
            type?: string;
        }
    ): Promise<TeamDocument> {
        const profile = await this.findByUserId(userId);

        if (profile.team) {
            throw new ConflictException('Team manager already has a team. Use update instead.');
        }

        const team = new this.teamModel({
            name: teamData.name,
            organizationName: teamData.organizationName || profile.organizationName,
            logo: teamData.logo,
            description: teamData.description,
            type: teamData.type || 'amateur',
            captain: new Types.ObjectId(userId),
            members: [],
        });

        const savedTeam = await team.save();

        await this.teamManagerProfileModel.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { team: savedTeam._id }
        );

        await this.teamModel.findByIdAndUpdate(savedTeam._id, {
            teamManager: profile._id,
        });

        return savedTeam;
    }

    async updateTeam(
        userId: string,
        teamData: {
            name?: string;
            organizationName?: string;
            logo?: string;
            description?: string;
            type?: string;
        }
    ): Promise<TeamDocument> {
        const profile = await this.findByUserId(userId);

        if (!profile.team) {
            throw new NotFoundException('No team linked to this manager. Create a team first.');
        }

        const updatedTeam = await this.teamModel.findByIdAndUpdate(
            profile.team,
            teamData,
            { new: true }
        );

        if (!updatedTeam) {
            throw new NotFoundException('Team not found');
        }

        return updatedTeam;
    }

    async getMyTeam(userId: string): Promise<TeamDocument> {
        const profile = await this.findByUserId(userId);

        if (!profile.team) {
            throw new NotFoundException('No team linked to this manager');
        }

        const team = await this.teamModel
            .findById(profile.team)
            .populate({ path: 'members', model: 'User', select: 'nickname avatar email' })
            .exec();

        if (!team) {
            throw new NotFoundException('Team not found');
        }

        return team;
    }

    async invitePlayer(userId: string, playerUserId: string): Promise<TeamDocument> {
        const profile = await this.findByUserId(userId);

        if (!profile.team) {
            throw new BadRequestException('Create a team first before inviting players');
        }

        const playerObjectId = new Types.ObjectId(playerUserId);

        const playerExists = await this.playerProfileModel.findOne({ userId: playerObjectId });
        if (!playerExists) {
            throw new NotFoundException('Player not found');
        }

        const team = await this.teamModel.findById(profile.team);
        if (!team) {
            throw new NotFoundException('Team not found');
        }

        const alreadyMember = team.members.some(
            (m) => m.toString() === playerObjectId.toString()
        );
        if (alreadyMember) {
            throw new ConflictException('Player is already a member of this team');
        }

        const updatedTeam = await this.teamModel.findByIdAndUpdate(
            profile.team,
            { $push: { members: playerObjectId } },
            { new: true }
        ).populate({ path: 'members', model: 'User', select: 'nickname avatar email' });

        if (!updatedTeam) {
            throw new NotFoundException('Team not found');
        }

        return updatedTeam;
    }

    async removePlayer(userId: string, playerUserId: string): Promise<TeamDocument> {
        const profile = await this.findByUserId(userId);

        if (!profile.team) {
            throw new BadRequestException('No team linked to this manager');
        }

        const updatedTeam = await this.teamModel.findByIdAndUpdate(
            profile.team,
            { $pull: { members: new Types.ObjectId(playerUserId) } },
            { new: true }
        ).populate({ path: 'members', model: 'User', select: 'nickname avatar email' });

        if (!updatedTeam) {
            throw new NotFoundException('Team not found');
        }

        return updatedTeam;
    }

    async searchAvailablePlayers(search?: string): Promise<any[]> {
        const filter: any = {};
        if (search) {
            filter['$or'] = [
                { nickname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        return this.playerProfileModel
            .find()
            .populate({ path: 'userId', model: 'User', select: 'nickname avatar email country', match: search ? filter : {} })
            .exec()
            .then((profiles) => profiles.filter((p) => p.userId !== null));
    }

    async findByUserIdWithTeam(userId: string): Promise<TeamManagerProfileDocument> {
        const userObjectId = new Types.ObjectId(userId);
        const profile = await this.teamManagerProfileModel
            .findOne({ userId: userObjectId })
            .populate('team')
            .exec();

        if (!profile) {
            throw new NotFoundException('Team manager profile not found');
        }

        return profile;
    }
}
