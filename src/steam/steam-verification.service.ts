import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SteamVerificationService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async linkSteamAccount(userId: string, steamId: string): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({ steamId, _id: { $ne: userId } });
    if (existingUser) {
      throw new ConflictException('This Steam account is already linked to another user');
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { steamId, steamVerified: false },
      { new: true },
    );

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async verifySteamOwnership(userId: string, steamId: string): Promise<UserDocument> {
    const apiKey = this.configService.get<string>('STEAM_API_KEY') || '';
    if (!apiKey) {
      throw new Error('STEAM_API_KEY is not configured on the server');
    }

    try {
      const response = await axios.get(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`,
        {
          params: {
            key: apiKey,
            steamids: steamId,
          },
        },
      );

      const players = response.data?.response?.players;
      if (!players || players.length === 0) {
        throw new NotFoundException('Steam profile not found');
      }

      const player = players[0];
      
      const user = await this.userModel.findByIdAndUpdate(
        userId,
        {
          steamVerified: true,
          steamUsername: player.personaname,
          steamAvatarUrl: player.avatarfull,
        },
        { new: true },
      );

      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to verify Steam ownership. Ensure your profile is public.');
    }
  }

  async isVerified(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('steamVerified').lean();
    return !!user?.steamVerified;
  }

  async unlinkSteamAccount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        steamId: null,
        steamUsername: null,
        steamAvatarUrl: null,
        steamVerified: false,
      },
    });
  }
}
