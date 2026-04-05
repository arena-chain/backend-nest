// src/player/player.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PlayerProfile, PlayerProfileDocument } from './schemas/player-profile.schema';

@Injectable()
export class PlayerService {
    constructor(
        @InjectModel(PlayerProfile.name) private playerProfileModel: Model<PlayerProfileDocument>,
    ) { }

    async create(
        userId: Types.ObjectId,
        profileData: { isPro?: boolean; isVerified?: boolean }
    ): Promise<PlayerProfileDocument> {
        const profile = new this.playerProfileModel({
            userId,
            isPro: profileData.isPro || false,
            isVerified: profileData.isVerified || false,
            elo: 1000,
            rank: 'Unranked',
            stats: {},
        });

        return profile.save();
    }

    private toObjectId(userId: string | Types.ObjectId): Types.ObjectId {
        return typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }

    async findByUserId(userId: string | Types.ObjectId): Promise<PlayerProfileDocument> {
        const profile = await this.playerProfileModel.findOne({ userId: this.toObjectId(userId) });

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        return profile;
    }

    async update(
        userId: string | Types.ObjectId,
        updateData: Partial<PlayerProfile>
    ): Promise<PlayerProfileDocument> {
        const profile = await this.playerProfileModel.findOneAndUpdate(
            { userId: this.toObjectId(userId) },
            updateData,
            { new: true },
        );

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        return profile;
    }

    async findOrCreateByUserId(userId: string | Types.ObjectId): Promise<PlayerProfileDocument> {
        const objectId = this.toObjectId(userId);
        const existing = await this.playerProfileModel.findOne({ userId: objectId });
        if (existing) return existing;

        try {
            const profile = new this.playerProfileModel({
                userId: objectId,
                isPro: false,
                isVerified: false,
                elo: 1000,
                rank: 'Unranked',
                stats: {},
            });
            return await profile.save();
        } catch (error: any) {
            if (error.code === 11000) {
                const found = await this.playerProfileModel.findOne({ userId: objectId });
                if (found) return found;
            }
            throw error;
        }
    }

    async findAll(filters?: { query?: string; rank?: string; isPro?: boolean }): Promise<any[]> {
        const pipeline: any[] = [];

        // Join with User collection
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userObject',
            },
        });

        // Unwind user object
        pipeline.push({ $unwind: '$userObject' });

        // Apply filters
        const match: any = {};
        if (filters?.query) {
            match['userObject.nickname'] = { $regex: filters.query, $options: 'i' };
        }
        if (filters?.rank) {
            match.rank = filters.rank;
        }
        if (filters?.isPro !== undefined) {
            match.isPro = filters.isPro;
        }

        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }

        // Project and Map to match 'populate' structure
        pipeline.push({
            $project: {
                _id: 1,
                isPro: 1,
                isVerified: 1,
                elo: 1,
                rank: 1,
                stats: 1,
                riotLinkStatus: 1,
                createdAt: 1,
                updatedAt: 1,
                userId: {
                    _id: '$userObject._id',
                    nickname: '$userObject.nickname',
                    email: '$userObject.email',
                    region: '$userObject.region',
                    country: '$userObject.country',
                    avatar: '$userObject.avatar',
                    role: '$userObject.role',
                },
            },
        });

        // Sort by elo descending
        pipeline.push({ $sort: { elo: -1 } });

        return this.playerProfileModel.aggregate(pipeline).exec();
    }
}
