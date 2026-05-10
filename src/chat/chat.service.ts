import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChatDto } from './dto/create-chat.dto';
import { Chat, ChatDocument } from './entities/chat.entity';
import { GroupChat, GroupChatDocument } from './entities/group-chat.entity';
import { UsersService } from '../user/user.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
    @InjectModel(GroupChat.name) private readonly groupChatModel: Model<GroupChatDocument>,
    private readonly usersService: UsersService,
  ) {}


  async createForUser(userId: string, createChatDto: CreateChatDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const channelId = Types.ObjectId.isValid(createChatDto.channelId) 
      ? new Types.ObjectId(createChatDto.channelId) 
      : createChatDto.channelId;

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(userId),
      senderNickname: user.nickname,
      senderRole: user.role,
      channelId: channelId,
      message: createChatDto.message.trim(),
    });

    return created.toObject();
  }

  async createPrivateMessage(senderId: string, receiverId: string, message: string) {
    const sender = await this.usersService.findById(senderId);
    if (!sender) throw new NotFoundException('Sender not found');

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      senderNickname: sender.nickname,
      senderRole: sender.role,
      message: message.trim(),
    });

    return created.toObject();
  }

  async assertGroupMember(groupId: string, userId: string) {
    const group = await this.groupChatModel
      .findById(groupId)
      .select('_id members')
      .lean()
      .exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((member) => member.toString() === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a group member');
    }
  }

  async createGroupMessage(senderId: string, groupId: string, message: string) {
    await this.assertGroupMember(groupId, senderId);

    const sender = await this.usersService.findById(senderId);
    if (!sender) throw new NotFoundException('Sender not found');

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(senderId),
      senderNickname: sender.nickname,
      senderRole: sender.role,
      channelId: new Types.ObjectId(groupId),
      message: message.trim(),
    });

    return created.toObject();
  }

  async createAnonymous(createChatDto: CreateChatDto, guestNickname: string) {
    const channelId = Types.ObjectId.isValid(createChatDto.channelId) 
      ? new Types.ObjectId(createChatDto.channelId) 
      : createChatDto.channelId;

    const created = await this.chatModel.create({
      senderId: null,
      senderNickname: guestNickname.trim(),
      senderRole: 'guest',
      channelId: channelId,
      message: createChatDto.message.trim(),
    });

    return created.toObject();
  }

  async findByChannel(channelId: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const parsedChannelId = Types.ObjectId.isValid(channelId) 
      ? new Types.ObjectId(channelId) 
      : channelId;

    const messages = await this.chatModel
      .find({ channelId: parsedChannelId })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec();

    return messages.reverse();
  }

  async getInbox(userId: string) {
    const uid = new Types.ObjectId(userId);
    const inbox = await this.chatModel.aggregate([
      {
        $match: {
          $or: [{ senderId: uid }, { receiverId: uid }],
          channelId: { $exists: false }, // Only private messages
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', uid] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$message' },
          lastMessageDate: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', uid] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'interlocutor',
        },
      },
      { $unwind: '$interlocutor' },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          lastMessageDate: 1,
          unreadCount: 1,
          'interlocutor._id': 1,
          'interlocutor.nickname': 1,
          'interlocutor.avatar': 1,
          'interlocutor.isActive': 1,
          'interlocutor.role': 1,
        },
      },
    ]);
    return inbox;
  }

  async getConversation(userId: string, otherUserId: string, limit = 50) {
    const uid = new Types.ObjectId(userId);
    const oid = new Types.ObjectId(otherUserId);

    const messages = await this.chatModel
      .find({
        $or: [
          { senderId: uid, receiverId: oid },
          { senderId: oid, receiverId: uid },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return messages.reverse();
  }

  async markAsRead(userId: string, otherUserId: string) {
    const uid = new Types.ObjectId(userId);
    const oid = new Types.ObjectId(otherUserId);

    await this.chatModel.updateMany(
      { senderId: oid, receiverId: uid, isRead: false },
      { $set: { isRead: true } },
    );
    return { success: true };
  }

  async deleteConversation(userId: string, otherUserId: string) {
    const uid = new Types.ObjectId(userId);
    const oid = new Types.ObjectId(otherUserId);

    await this.chatModel.deleteMany({
      $or: [
        { senderId: uid, receiverId: oid },
        { senderId: oid, receiverId: uid },
      ],
    });
    return { success: true };
  }

  async deleteMessage(messageId: string, userId: string) {
<<<<<<< HEAD
    const deleted = await this.chatModel.findOneAndDelete({
      _id: new Types.ObjectId(messageId),
      senderId: new Types.ObjectId(userId),
    });
    if (!deleted) {
      return null;
    }

    return {
      receiverId: deleted.receiverId ? deleted.receiverId.toString() : null,
      senderId: deleted.senderId ? deleted.senderId.toString() : null,
    };
=======
    if (!Types.ObjectId.isValid(messageId)) {
      return { deleted: false as const };
    }
    const doc = await this.chatModel.findOneAndDelete({
      _id: new Types.ObjectId(messageId),
      senderId: new Types.ObjectId(userId),
    });
    if (!doc) {
      return { deleted: false as const };
    }
    const receiverId = doc.receiverId?.toString();
    const senderId = doc.senderId?.toString();
    return { deleted: true as const, receiverId, senderId };
  }

  async assertGroupMember(groupId: string, userId: string) {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new ForbiddenException('Invalid group');
    }
    const group = await this.groupChatModel.findOne({
      _id: new Types.ObjectId(groupId),
      members: new Types.ObjectId(userId),
    });
    if (!group) {
      throw new ForbiddenException('Not a group member');
    }
  }

  async getGroupMessages(groupId: string, userId: string, limit = 100) {
    await this.assertGroupMember(groupId, userId);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const parsedChannelId = Types.ObjectId.isValid(groupId)
      ? new Types.ObjectId(groupId)
      : groupId;

    const messages = await this.chatModel
      .find({ channelId: parsedChannelId })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec();

    return messages.reverse();
  }

  async createGroupMessage(senderId: string, groupId: string, message: string) {
    await this.assertGroupMember(groupId, senderId);
    const sender = await this.usersService.findById(senderId);
    if (!sender) throw new NotFoundException('Sender not found');

    const channelId = Types.ObjectId.isValid(groupId)
      ? new Types.ObjectId(groupId)
      : groupId;

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(senderId),
      channelId,
      senderNickname: sender.nickname,
      senderRole: sender.role,
      message: message.trim(),
    });

    return created.toObject();
>>>>>>> origin/Integration_8.1.0
  }

  async getMyGroups(userId: string) {
    return this.groupChatModel
      .find({
        members: new Types.ObjectId(userId),
      })
      .sort({ updatedAt: -1 })
      .populate('members', 'nickname avatar')
      .lean()
      .exec();
  }

  async createGroup(ownerId: string, dto: any) {
    const members = (dto.memberIds || []).map((id) => new Types.ObjectId(id));
    if (!members.find((m) => m.toString() === ownerId)) {
      members.push(new Types.ObjectId(ownerId));
    }

    const group = await this.groupChatModel.create({
      name: dto.name,
      description: dto.description || '',
      type: dto.type || 'group',
      isPrivate: dto.isPrivate || false,
      ownerId: new Types.ObjectId(ownerId),
      members: members,
    });

    return group.populate('members', 'nickname avatar');
  }

  async inviteToGroup(groupId: string, memberId: string, inviterUserId: string) {
    await this.assertGroupMember(groupId, inviterUserId);
    return this.groupChatModel
      .findByIdAndUpdate(
        groupId,
        { $addToSet: { members: new Types.ObjectId(memberId) } },
        { new: true },
      )
      .populate('members', 'nickname avatar');
  }

  async leaveGroup(groupId: string, userId: string) {
    return this.groupChatModel
      .findByIdAndUpdate(
        groupId,
        { $pull: { members: new Types.ObjectId(userId) } },
        { new: true },
      )
      .populate('members', 'nickname avatar');
  }

  async deleteGroup(groupId: string, userId: string) {
    const res = await this.groupChatModel.deleteOne({
      _id: new Types.ObjectId(groupId),
      ownerId: new Types.ObjectId(userId),
    });
    return res.deletedCount > 0;
  }

  async deleteGroupMessages(groupId: string, userId: string) {
    const group = await this.groupChatModel.findOne({
      _id: new Types.ObjectId(groupId),
      ownerId: new Types.ObjectId(userId),
    });
    if (!group) return { success: false, error: 'Unauthorized' };

    await this.chatModel.deleteMany({ channelId: groupId });
    return { success: true };
  }
}



