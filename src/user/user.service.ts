// src/user/user.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async create(userData: {
        email: string;
        password: string;
        nickname: string;
    }): Promise<UserDocument> {
        const existingUser = await this.userModel.findOne({ email: userData.email });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const user = new this.userModel({
            email: userData.email,
            passwordHash: userData.password, // Already hashed in auth service
            nickname: userData.nickname,
            isActive: true,
        });

        return user.save();
    }

    async findByEmail(email: string): Promise<UserDocument> {
        const user = await this.userModel.findOne({ email: email.toLowerCase() });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
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
        return this.userModel.find().exec();
    }

    async block(id: string): Promise<UserDocument> {
        return this.update(id, { isActive: false });
    }

    async unblock(id: string): Promise<UserDocument> {
        return this.update(id, { isActive: true });
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
