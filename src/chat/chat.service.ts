import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChatDto } from './dto/create-chat.dto';
import { Chat, ChatDocument } from './entities/chat.entity';
import { UsersService } from '../user/user.service';
import { FriendshipService } from '../friendship/friendship.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
    private readonly usersService: UsersService,
    private readonly friendshipService: FriendshipService,
  ) {}

  async createForUser(userId: string, createChatDto: CreateChatDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(userId),
      senderNickname: user.nickname,
      senderRole: user.role,
      channelId: new Types.ObjectId(createChatDto.channelId),
      message: createChatDto.message.trim(),
    });

    return created.toObject();
  }

  async createAnonymous(createChatDto: CreateChatDto, guestNickname: string) {
    const created = await this.chatModel.create({
      senderId: null,
      senderNickname: guestNickname.trim(),
      senderRole: 'guest',
      channelId: new Types.ObjectId(createChatDto.channelId),
      message: createChatDto.message.trim(),
    });

    return created.toObject();
  }

  async findByChannel(channelId: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await this.chatModel
      .find({ channelId: new Types.ObjectId(channelId) })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec();

    return messages.reverse();
  }

  /**
   * DEBUG: Get all messages involving a user (no filter)
   */
  async debugGetAllMessages(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    const uId = new Types.ObjectId(userId);
    return this.chatModel
      .find({ $or: [{ senderId: uId }, { receiverId: uId }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();
  }

  /**
   * Create Private 1-to-1 Message
   */
  async createPrivateMessage(
    senderId: string, 
    receiverId: string, 
    message: string, 
    messageType = 'text', 
    attachments: string[] = []
  ) {
    if (!Types.ObjectId.isValid(senderId) || !Types.ObjectId.isValid(receiverId)) {
      throw new Error('Invalid senderId or receiverId format');
    }

    // NEW: Check if friendship exists
    // const areFriends = await this.friendshipService.areFriends(senderId, receiverId);
    // if (!areFriends) {
    //   throw new BadRequestException('You can only send private messages to your friends');
    // }

    const sender = await this.usersService.findById(senderId);
    const receiver = await this.usersService.findById(receiverId);

    // BLOCK ADMIN MESSAGING
    if (sender?.role === 'admin' || receiver?.role === 'admin') {
      throw new BadRequestException('Administrators cannot participate in private messaging');
    }
    
    const created = await this.chatModel.create({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      senderNickname: sender?.nickname || 'Unknown',
      senderRole: sender?.role || 'player',
      message: message.trim(),
      messageType,
      attachments,
      isRead: false
    });

    return created.toObject();
  }

  /**
   * Get Private Conversation history (1-to-1)
   */
  async findPrivateConversation(user1: string, user2: string, limit = 50) {
    if (!Types.ObjectId.isValid(user1) || !Types.ObjectId.isValid(user2)) {
      return [];
    }
    const u1 = new Types.ObjectId(user1);
    const u2 = new Types.ObjectId(user2);
    
    const messages = await this.chatModel
      .find({
        $or: [
          { senderId: u1, receiverId: u2 },
          { senderId: u2, receiverId: u1 }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return messages.reverse();
  }

  /**
   * Get all active conversations for a user (Inbox)
   */
  async getInbox(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    const uId = new Types.ObjectId(userId);

    // Step 1: Find all private messages involving this user
    const messages = await this.chatModel
      .find({
        $and: [
          { $or: [{ senderId: uId }, { receiverId: uId }] },
          { $or: [{ channelId: { $exists: false } }, { channelId: null }] }
        ]
      })
      .sort({ createdAt: -1 })
      .lean<any[]>()
      .exec();

    if (messages.length === 0) return [];

    // Step 2: Find unique interlocutors
    const interlocutorMap = new Map<string, any>();

    for (const msg of messages) {
      const senderId = msg.senderId?.toString();
      const receiverId = msg.receiverId?.toString();
      const interlocutorId = senderId === userId ? receiverId : senderId;

      if (!interlocutorId || interlocutorId === userId) continue;

      if (!interlocutorMap.has(interlocutorId)) {
        const unreadCount = messages.filter((m: any) =>
          m.senderId?.toString() === interlocutorId &&
          m.receiverId?.toString() === userId &&
          !m.isRead
        ).length;

        interlocutorMap.set(interlocutorId, {
          _id: interlocutorId,
          lastMessage: (msg as any).message,
          lastMessageDate: (msg as any).createdAt,
          unreadCount,
          interlocutor: null
        });
      }
    }

    // Step 3: Fetch interlocutor user data and filter out admins
    const result: any[] = [];
    for (const [id, conv] of interlocutorMap.entries()) {
      try {
        const user = await this.usersService.findById(id);
        const role = (user.role || '').toLowerCase();
        const nickname = (user.nickname || '').toLowerCase();
        
        // AGGRESSIVE FILTER: Any role/nickname containing 'admin' or 'system'
        if (user && !role.includes('admin') && !role.includes('system') && 
            !nickname.includes('admin') && !nickname.includes('system')) {
          conv.interlocutor = {
            _id: user._id,
            nickname: user.nickname,
            avatar: user.avatar,
            isActive: user.isActive,
            role: user.role
          };
          result.push(conv);
        }
      } catch (e) {
        // Skip if user not found
      }
    }

    return result.sort((a, b) =>
      new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
    );
  }

  /**
   * Mark messages as read
   */
  async markAsRead(receiverId: string, senderId: string) {
    if (!Types.ObjectId.isValid(receiverId) || !Types.ObjectId.isValid(senderId)) {
      return { n: 0, nModified: 0, ok: 1 };
    }
    return this.chatModel.updateMany(
      { 
        senderId: new Types.ObjectId(senderId), 
        receiverId: new Types.ObjectId(receiverId), 
        isRead: false 
      },
      { $set: { isRead: true } }
    ).exec();
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(userId: string, messageId: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(messageId)) {
      throw new Error('Invalid IDs');
    }
    // Users can only delete messages they sent
    const result = await this.chatModel.deleteOne({
      _id: new Types.ObjectId(messageId),
      senderId: new Types.ObjectId(userId)
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Message not found or you are not the sender');
    }
    return { success: true };
  }

  /**
   * Delete entire conversation with another user
   */
  async deleteConversation(userId: string, interlocutorId: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(interlocutorId)) {
      throw new Error('Invalid IDs');
    }
    const uId = new Types.ObjectId(userId);
    const iId = new Types.ObjectId(interlocutorId);

    // Deletes ALL messages between these two users
    await this.chatModel.deleteMany({
      $or: [
        { senderId: uId, receiverId: iId },
        { senderId: iId, receiverId: uId }
      ]
    }).exec();

    return { success: true };
  }
}
