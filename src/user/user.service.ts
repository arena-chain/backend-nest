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
}
