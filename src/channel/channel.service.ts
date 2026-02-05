import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(createChannelDto: CreateChannelDto): Promise<ChannelDocument> {
    const channel = new this.channelModel({
      ...createChannelDto,
      ownerId: new Types.ObjectId(createChannelDto.ownerId),
      subscribers: [],
      subscriberCount: 0,
    });
    return channel.save();
  }

  async findAll(): Promise<ChannelDocument[]> {
    return this.channelModel.find().populate('ownerId', 'email nickname').exec();
  }

  async findOne(id: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findById(id).populate('ownerId', 'email nickname').exec();

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    return channel;
  }

  async findByOwner(ownerId: string): Promise<ChannelDocument[]> {
    return this.channelModel.find({ ownerId }).exec();
  }

  async update(id: string, updateChannelDto: UpdateChannelDto): Promise<ChannelDocument> {
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

  async remove(id: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findByIdAndDelete(id).exec();

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    return channel;
  }
}
