// src/friendship/friendship.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friendship, FriendshipDocument, FriendshipStatus } from './schemas/friendship.schema';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
  ) { }

  /**
   * Send a friend request
   */
  async sendFriendRequest(requesterId: string, recipientId: string): Promise<FriendshipDocument> {
    // Validate that users are different
    if (requesterId === recipientId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: new Types.ObjectId(requesterId), recipientId: new Types.ObjectId(recipientId) },
        { requesterId: new Types.ObjectId(recipientId), recipientId: new Types.ObjectId(requesterId) },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('You are already friends');
      }
      if (existingFriendship.status === FriendshipStatus.PENDING) {
        throw new ConflictException('Friend request already pending');
      }
      if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('Cannot send friend request - user is blocked');
      }
    }

    // Create new friend request
    const friendship = new this.friendshipModel({
      requesterId: new Types.ObjectId(requesterId),
      recipientId: new Types.ObjectId(recipientId),
      status: FriendshipStatus.PENDING,
    });

    return friendship.save();
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string, friendshipId: string): Promise<FriendshipDocument> {
    const friendship = await this.friendshipModel.findById(friendshipId);

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Ensure the user is the recipient
    if (friendship.recipientId.toString() !== userId) {
      throw new BadRequestException('You are not authorized to accept this request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request is no longer pending');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    friendship.acceptedAt = new Date();

    return friendship.save();
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(userId: string, friendshipId: string): Promise<FriendshipDocument> {
    const friendship = await this.friendshipModel.findById(friendshipId);

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Ensure the user is the recipient
    if (friendship.recipientId.toString() !== userId) {
      throw new BadRequestException('You are not authorized to reject this request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request is no longer pending');
    }

    friendship.status = FriendshipStatus.REJECTED;
    friendship.rejectedAt = new Date();

    return friendship.save();
  }

  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: new Types.ObjectId(userId), recipientId: new Types.ObjectId(friendId) },
        { requesterId: new Types.ObjectId(friendId), recipientId: new Types.ObjectId(userId) },
      ],
      status: FriendshipStatus.ACCEPTED,
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipModel.findByIdAndDelete(friendship._id);
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<FriendshipDocument> {
    // Check if friendship exists
    let friendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: new Types.ObjectId(userId), recipientId: new Types.ObjectId(blockedUserId) },
        { requesterId: new Types.ObjectId(blockedUserId), recipientId: new Types.ObjectId(userId) },
      ],
    });

    if (friendship) {
      // Update existing relationship
      friendship.status = FriendshipStatus.BLOCKED;
      friendship.blockedAt = new Date();
      // Ensure the blocker is the requester
      if (friendship.recipientId.toString() === userId) {
        [friendship.requesterId, friendship.recipientId] = [friendship.recipientId, friendship.requesterId];
      }
      return friendship.save();
    } else {
      // Create new blocked relationship
      friendship = new this.friendshipModel({
        requesterId: new Types.ObjectId(userId),
        recipientId: new Types.ObjectId(blockedUserId),
        status: FriendshipStatus.BLOCKED,
        blockedAt: new Date(),
      });
      return friendship.save();
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const friendship = await this.friendshipModel.findOne({
      requesterId: new Types.ObjectId(userId),
      recipientId: new Types.ObjectId(blockedUserId),
      status: FriendshipStatus.BLOCKED,
    });

    if (!friendship) {
      throw new NotFoundException('Blocked relationship not found');
    }

    await this.friendshipModel.findByIdAndDelete(friendship._id);
  }

  /**
   * Get all friends of a user (accepted friendships only)
   */
  async getFriends(userId: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({
        $or: [
          { requesterId: new Types.ObjectId(userId), status: FriendshipStatus.ACCEPTED },
          { recipientId: new Types.ObjectId(userId), status: FriendshipStatus.ACCEPTED },
        ],
      })
      .populate('requesterId', 'nickname email avatar')
      .populate('recipientId', 'nickname email avatar')
      .exec();
  }

  /**
   * Get pending friend requests (received by user)
   */
  async getPendingRequests(userId: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({
        recipientId: new Types.ObjectId(userId),
        status: FriendshipStatus.PENDING,
      })
      .populate('requesterId', 'nickname email avatar')
      .exec();
  }

  /**
   * Get sent friend requests (sent by user)
   */
  async getSentRequests(userId: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({
        requesterId: new Types.ObjectId(userId),
        status: FriendshipStatus.PENDING,
      })
      .populate('recipientId', 'nickname email avatar')
      .exec();
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({
        requesterId: new Types.ObjectId(userId),
        status: FriendshipStatus.BLOCKED,
      })
      .populate('recipientId', 'nickname email avatar')
      .exec();
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: new Types.ObjectId(userId1), recipientId: new Types.ObjectId(userId2) },
        { requesterId: new Types.ObjectId(userId2), recipientId: new Types.ObjectId(userId1) },
      ],
      status: FriendshipStatus.ACCEPTED,
    });

    return !!friendship;
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(userId1: string, userId2: string): Promise<string> {
    const friendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: new Types.ObjectId(userId1), recipientId: new Types.ObjectId(userId2) },
        { requesterId: new Types.ObjectId(userId2), recipientId: new Types.ObjectId(userId1) },
      ],
    });

    if (!friendship) return 'NONE';
    return friendship.status;
  }
}
