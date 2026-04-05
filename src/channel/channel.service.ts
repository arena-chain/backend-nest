import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel, ChannelDocument } from './entities/channel.entity';

@Injectable()
export class ChannelService {
  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
  ) { }

  async create(ownerId: string, createChannelDto: CreateChannelDto): Promise<ChannelDocument> {
    const existing = await this.channelModel.findOne({ ownerId: new Types.ObjectId(ownerId) }).exec();

    if (existing) {
      throw new ConflictException('This user already has a channel');
    }

    const channel = new this.channelModel({
      ...createChannelDto,
      ownerId: new Types.ObjectId(ownerId),
      subscribers: [],
      subscriberCount: 0,
    });
    return channel.save().then((doc) => doc.populate('ownerId', 'email nickname'));
  }

  async findAll(): Promise<ChannelDocument[]> {
    return this.channelModel.find().populate('ownerId', 'email nickname').exec();
  }

  async findMine(ownerId: string): Promise<ChannelDocument | null> {
    return this.channelModel.findOne({ ownerId: new Types.ObjectId(ownerId) }).populate('ownerId', 'email nickname').exec();
  }

  async findOne(id: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findById(id).populate('ownerId', 'email nickname').exec();

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    return channel;
  }

  async findByOwner(ownerId: string): Promise<ChannelDocument[]> {
    return this.channelModel.find({ ownerId: new Types.ObjectId(ownerId) }).populate('ownerId', 'email nickname').exec();
  }

  async update(id: string, ownerId: string, updateChannelDto: UpdateChannelDto): Promise<ChannelDocument> {
    const existing = await this.channelModel.findById(id).exec();

    if (!existing) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    if (existing.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You can only update your own channel');
    }

    const channel = await this.channelModel.findByIdAndUpdate(
      id,
      updateChannelDto,
      { new: true },
    ).populate('ownerId', 'email nickname').exec();

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    return channel;
  }

  async remove(id: string, ownerId: string): Promise<ChannelDocument> {
    const existing = await this.channelModel.findById(id).exec();

    if (!existing) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    if (existing.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You can only delete your own channel');
    }

    const channel = await this.channelModel.findByIdAndDelete(id).exec();

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    return channel;
  }

  async subscribe(channelId: string, userId: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const userOid = new Types.ObjectId(userId);
    if (channel.subscribers.includes(userOid)) {
      throw new ConflictException('Already subscribed to this channel');
    }

    channel.subscribers.push(userOid);
    channel.subscriberCount = channel.subscribers.length;
    return channel.save();
  }

  async unsubscribe(channelId: string, userId: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const userOid = new Types.ObjectId(userId);
    channel.subscribers = channel.subscribers.filter(id => id.toString() !== userId);
    channel.subscriberCount = channel.subscribers.length;
    return channel.save();
  }

  async isSubscribed(channelId: string, userId: string): Promise<boolean> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) return false;
    return channel.subscribers.some(id => id.toString() === userId);
  }
}
