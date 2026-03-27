// src/user/user.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
    block(id: string) {
        throw new Error('Method not implemented.');
    }
    unblock(id: string) {
        throw new Error('Method not implemented.');
    }
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async create(userData: {
        email: string;
        password: string;
        nickname: string;
        role?: string;
        region?: string;
        country?: string;
    }): Promise<UserDocument> {
        const existingUser = await this.userModel.findOne({ email: userData.email });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const user = new this.userModel({
            email: userData.email,
            passwordHash: userData.password, // Already hashed in auth service
            nickname: userData.nickname,
            role: userData.role || 'player',
            region: userData.region || 'EUROPE',
            country: userData.country || 'TUNISIA',
            isActive: true,
        });

        return user.save();
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() });
    }

    async findByGoogleId(googleId: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ googleId });
    }

    async findBySteamId(steamId: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ steamId });
    }

    async createWithGoogle(googleData: {
        email: string;
        nickname: string;
        googleId: string;
        role?: string;
    }): Promise<UserDocument> {
        const user = new this.userModel({
            email: googleData.email,
            nickname: googleData.nickname,
            googleId: googleData.googleId,
            role: googleData.role || 'player',
            passwordHash: 'google_auth_no_password', // Placeholder
            isEmailVerified: true, // Google emails are pre-verified
            isActive: true,
        });

        return user.save();
    }

    async createWithSteam(steamData: {
        nickname: string;
        steamId: string;
        role?: string;
    }): Promise<UserDocument> {
        const user = new this.userModel({
            email: `${steamData.steamId}@steam.com`, // Use steamId as part of a placeholder email
            nickname: steamData.nickname,
            steamId: steamData.steamId,
            role: steamData.role || 'player',
            passwordHash: 'steam_auth_no_password', // Placeholder
            isEmailVerified: true,
            isActive: true,
        });

        return user.save();
    }

    async findById(id: string): Promise<UserDocument> {
        const user = await this.userModel.findById(id);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, { refreshToken });
    }

    async update(id: string, updateData: Partial<User>): Promise<UserDocument> {
        const user = await this.userModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true },
        );

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findAll(): Promise<UserDocument[]> {
        return this.userModel.find().select('-passwordHash -emailVerificationOtp -resetPasswordOtp -refreshToken').exec();
    }

    async remove(id: string): Promise<void> {
        const result = await this.userModel.findByIdAndDelete(id);
        if (!result) {
            throw new NotFoundException('User not found');
        }
    }

    /**
     * Search for users by nickname or email
     * @param query - Search query (nickname or email)
     * @param excludeUserId - Optional user ID to exclude from results (e.g., current user)
     */
    async searchUsers(query: string, excludeUserId?: string): Promise<UserDocument[]> {
        const searchRegex = new RegExp(query, 'i'); // Case-insensitive search

        const filter: any = {
            $or: [
                { nickname: searchRegex },
                { email: searchRegex },
            ],
            isActive: true, // Only return active users
        };

        // Exclude specific user (e.g., current user)
        if (excludeUserId) {
            filter._id = { $ne: excludeUserId };
        }

        return this.userModel
            .find(filter)
            .select('_id nickname email') // Only return necessary fields
            .limit(20) // Limit results to prevent performance issues
            .exec();
    }
}
