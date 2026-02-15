import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { Stream, StreamDocument } from './entities/stream.entity';

@Injectable()
export class StreamService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
  ) { }

  async create(createStreamDto: CreateStreamDto): Promise<StreamDocument> {
    const stream = new this.streamModel({
      ...createStreamDto,
      streamerId: new Types.ObjectId(createStreamDto.streamerId),
      viewerCount: 0,
      startedAt: createStreamDto.isLive ? new Date() : undefined,
    });
    return stream.save();
  }

  async findAll(): Promise<StreamDocument[]> {
    return this.streamModel.find().populate('streamerId', 'email nickname').exec();
  }

  async findOne(id: string): Promise<StreamDocument> {
    const stream = await this.streamModel.findById(id).populate('streamerId', 'email nickname').exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    return stream;
  }

  async findByStreamer(streamerId: string): Promise<StreamDocument[]> {
    return this.streamModel.find({ streamerId }).exec();
  }

  async findLiveStreams(): Promise<StreamDocument[]> {
    return this.streamModel.find({ isLive: true }).populate('streamerId', 'email nickname').exec();
  }

  async update(id: string, updateStreamDto: UpdateStreamDto): Promise<StreamDocument> {
    const stream = await this.streamModel.findByIdAndUpdate(
      id,
      updateStreamDto,
      { new: true },
    ).populate('streamerId', 'email nickname').exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    return stream;
  }

  async remove(id: string): Promise<StreamDocument> {
    const stream = await this.streamModel.findByIdAndDelete(id).exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    return stream;
  }
}
