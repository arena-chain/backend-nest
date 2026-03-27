import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoDocument } from './schema/video.schema';

@Injectable()
export class VideoService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
  ) { }

  async create(createVideoDto: CreateVideoDto): Promise<Video> {
    const videoData = {
      ...createVideoDto,
      uploader: new Types.ObjectId(createVideoDto.uploader),
      game: createVideoDto.game ? new Types.ObjectId(createVideoDto.game) : undefined,
    };
    const createdVideo = new this.videoModel(videoData);
    return await createdVideo.save();
  }

  async findAll(): Promise<Video[]> {
    return await this.videoModel
      .find()
      .populate('uploader', 'username email avatar')
      .populate('game', 'title genre')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Video> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid video ID');
    }
    const video = await this.videoModel
      .findById(id)
      .populate('uploader', 'username email avatar')
      .populate('game', 'title genre')
      .exec();

    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }
    return video;
  }

  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid video ID');
    }

    const updateData: any = { ...updateVideoDto };
    if (updateData.uploader) delete updateData.uploader; // Prevent changing uploader roughly, or convert if needed
    if (updateData.game) updateData.game = new Types.ObjectId(updateData.game);

    const updatedVideo = await this.videoModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('uploader', 'username email avatar')
      .populate('game', 'title genre')
      .exec();

    if (!updatedVideo) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }
    return updatedVideo;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid video ID');
    }
    const result = await this.videoModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }
    return { message: 'Video deleted successfully' };
  }
}
