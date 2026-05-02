import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChatDto } from './dto/create-chat.dto';
import { Chat, ChatDocument } from './entities/chat.entity';
import { UsersService } from '../user/user.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
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
}
