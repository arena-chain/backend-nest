import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChatDto } from './dto/create-chat.dto';
import { Chat, ChatDocument } from './entities/chat.entity';
import { GroupChat, GroupChatDocument } from './entities/group-chat.entity';
import { UsersService } from '../user/user.service';

function toChannelIdValue(channelId: string): Types.ObjectId | string {
  if (Types.ObjectId.isValid(channelId)) {
    const asOid = new Types.ObjectId(channelId);
    if (asOid.toString() === channelId) {
      return asOid;
    }
  }
  return channelId;
}

function channelIdMatch(channelId: string) {
  const value = toChannelIdValue(channelId);
  if (value instanceof Types.ObjectId) {
    return { $in: [value, channelId] };
  }
  return value;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
    @InjectModel(GroupChat.name)
    private readonly groupChatModel: Model<GroupChatDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createForUser(userId: string, createChatDto: CreateChatDto) {
    const user = await this.usersService.findById(userId);

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(userId),
      senderNickname: user.nickname,
      senderRole: user.role,
      channelId: toChannelIdValue(createChatDto.channelId),
      message: createChatDto.message.trim(),
    });

    return created.toObject();
  }

  async createAnonymous(createChatDto: CreateChatDto, guestNickname: string) {
    const created = await this.chatModel.create({
      senderId: null,
      senderNickname: guestNickname.trim(),
      senderRole: 'guest',
      channelId: toChannelIdValue(createChatDto.channelId),
      message: createChatDto.message.trim(),
    });

    return created.toObject();
  }

  async findByChannel(channelId: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await this.chatModel
      .find({ channelId: channelIdMatch(channelId) })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec();

    return messages.reverse();
  }

  async createPrivateMessage(
    senderId: string,
    receiverId: string,
    message: string,
  ) {
    const sender = await this.usersService.findById(senderId);
    await this.usersService.findById(receiverId);

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      senderNickname: sender.nickname,
      senderRole: sender.role,
      message: message.trim(),
    });

    return created.toObject();
  }

  async getInbox(userId: string) {
    const uid = new Types.ObjectId(userId);
    const rows = await this.chatModel
      .aggregate([
        {
          $match: {
            receiverId: { $exists: true, $ne: null },
            senderId: { $ne: null },
            $or: [{ senderId: uid }, { receiverId: uid }],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              $cond: [{ $eq: ['$senderId', uid] }, '$receiverId', '$senderId'],
            },
            lastMessage: { $first: '$$ROOT' },
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
        { $sort: { 'lastMessage.createdAt': -1 } },
      ])
      .exec();

    return rows.map((r) => ({
      userId: r._id?.toString?.() ?? String(r._id),
      lastMessage: r.lastMessage,
      unreadCount: r.unreadCount,
    }));
  }

  async getConversation(userId: string, otherUserId: string, limit = 50) {
    const uid = new Types.ObjectId(userId);
    const oid = new Types.ObjectId(otherUserId);
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    return this.chatModel
      .find({
        $or: [
          { senderId: uid, receiverId: oid },
          { senderId: oid, receiverId: uid },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(safeLimit)
      .lean()
      .exec();
  }

  async markAsRead(userId: string, otherUserId: string) {
    const uid = new Types.ObjectId(userId);
    const oid = new Types.ObjectId(otherUserId);

    await this.chatModel.updateMany(
      { senderId: oid, receiverId: uid, isRead: false },
      { $set: { isRead: true } },
    );

    return { ok: true };
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

    return { ok: true };
  }

  async deleteMessage(messageId: string, userId: string) {
    const doc = await this.chatModel.findById(messageId);
    if (!doc) {
      throw new NotFoundException('Message not found');
    }

    const uid = userId;
    const isSender = doc.senderId?.toString() === uid;
    const isReceiver = doc.receiverId?.toString() === uid;
    if (!isSender && !isReceiver) {
      throw new ForbiddenException('Cannot delete this message');
    }

    const senderIdStr = doc.senderId?.toString();
    const receiverIdStr = doc.receiverId?.toString();
    await doc.deleteOne();
    return { ok: true, id: messageId, senderId: senderIdStr, receiverId: receiverIdStr };
  }

  async assertGroupMember(groupId: string, userId: string) {
    const g = await this.groupChatModel.findById(groupId);
    if (!g) {
      throw new NotFoundException('Group not found');
    }
    const uid = new Types.ObjectId(userId);
    const ok = g.members.some((m) => m.equals(uid));
    if (!ok) {
      throw new ForbiddenException('Not a group member');
    }
    return g;
  }

  async createGroupMessage(senderId: string, groupId: string, message: string) {
    await this.assertGroupMember(groupId, senderId);
    const sender = await this.usersService.findById(senderId);

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(senderId),
      senderNickname: sender.nickname,
      senderRole: sender.role,
      channelId: groupId,
      message: message.trim(),
    });

    return created.toObject();
  }

  async getMyGroups(userId: string) {
    const uid = new Types.ObjectId(userId);
    return this.groupChatModel
      .find({ members: uid })
      .populate('members', 'nickname email')
      .populate('ownerId', 'nickname email')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
  }

  async createGroup(
    ownerId: string,
    body: {
      name: string;
      type?: 'room' | 'group';
      description?: string;
      isPrivate?: boolean;
    },
  ) {
    const oid = new Types.ObjectId(ownerId);
    const created = await this.groupChatModel.create({
      name: body.name.trim(),
      type: body.type === 'room' ? 'room' : 'group',
      description: body.description?.trim(),
      isPrivate: !!body.isPrivate,
      ownerId: oid,
      members: [oid],
    });
    return created.toObject();
  }

  async inviteToGroup(groupId: string, memberId: string, actorId: string) {
    const g = await this.assertGroupMember(groupId, actorId);
    const mid = new Types.ObjectId(memberId);
    if (g.members.some((m) => m.equals(mid))) {
      return g.toObject();
    }
    g.members.push(mid);
    await g.save();
    return g.toObject();
  }

  async leaveGroup(groupId: string, userId: string) {
    const g = await this.groupChatModel.findById(groupId);
    if (!g) {
      throw new NotFoundException('Group not found');
    }
    const uid = new Types.ObjectId(userId);
    g.members = g.members.filter((m) => !m.equals(uid));
    await g.save();
    return { ok: true };
  }

  async deleteGroup(groupId: string, userId: string) {
    const g = await this.groupChatModel.findById(groupId);
    if (!g) {
      throw new NotFoundException('Group not found');
    }
    if (g.ownerId.toString() !== userId) {
      throw new ForbiddenException('Only the owner can delete the group');
    }
    await this.chatModel.deleteMany({ channelId: groupId });
    await g.deleteOne();
    return { ok: true };
  }

  async deleteGroupMessages(groupId: string, userId: string) {
    await this.assertGroupMember(groupId, userId);
    await this.chatModel.deleteMany({ channelId: groupId });
    return { ok: true };
  }

  async getGroupMessages(groupId: string, userId: string, limit = 100) {
    await this.assertGroupMember(groupId, userId);
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return this.chatModel
      .find({ channelId: groupId })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec()
      .then((m) => m.reverse());
  }
}
