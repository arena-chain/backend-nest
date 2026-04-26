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
            stats: {},
        });

        return profile.save();
    }

    private toObjectId(userId: string | Types.ObjectId): Types.ObjectId {
        return typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }

    async findByUserId(userId: string | Types.ObjectId): Promise<PlayerProfileDocument> {
        const profile = await this.playerProfileModel.findOne({ userId: this.toObjectId(userId) }).populate('userId');

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
        ).populate('userId');

        if (!profile) {
            throw new NotFoundException('Player profile not found');
        }

        return profile;
    }

    async findOrCreateByUserId(userId: string | Types.ObjectId): Promise<PlayerProfileDocument> {
        const objectId = this.toObjectId(userId);
        const existing = await this.playerProfileModel.findOne({ userId: objectId }).populate('userId');
        if (existing) return existing;

        try {
            const profile = new this.playerProfileModel({
                userId: objectId,
                isPro: false,
                isVerified: false,
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

    async findAll(): Promise<PlayerProfileDocument[]> {
        return this.playerProfileModel.find().populate('userId').exec();
    }
}
