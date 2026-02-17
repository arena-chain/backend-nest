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

    async findByUserId(userId: string | Types.ObjectId): Promise<PlayerProfileDocument> {
        const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        const profile = await this.playerProfileModel.findOne({ userId: id });

        if (!profile) {
            throw new NotFoundException(`Player profile not found for user ${id}`);
        }

        return profile;
    }

    async update(
        userId: string | Types.ObjectId,
        updateData: Partial<PlayerProfile>
    ): Promise<PlayerProfileDocument> {
        const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        const profile = await this.playerProfileModel.findOneAndUpdate(
            { userId: id },
            updateData,
            { new: true },
        );

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        return profile;
    }

    async findAll(): Promise<PlayerProfileDocument[]> {
        return this.playerProfileModel.find().populate('userId').exec();
    }
}
