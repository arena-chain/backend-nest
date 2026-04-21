import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel, ChannelDocument } from './entities/channel.entity';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

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
    const saved = await channel.save();
    this.logger.log(`Channel created id=${saved._id.toString()} owner=${ownerId} name=${saved.name}`);
    await saved.populate('ownerId', 'email nickname');
    return saved;
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
}
