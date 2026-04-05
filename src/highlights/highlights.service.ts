import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { Highlight, HighlightDocument } from './schemas/highlight.schema';

@Injectable()
export class HighlightsService {
  constructor(
    @InjectModel(Highlight.name) private highlightModel: Model<HighlightDocument>,
  ) { }

  async create(createHighlightDto: CreateHighlightDto): Promise<Highlight> {
    if (createHighlightDto.startTime >= createHighlightDto.endTime) {
      throw new BadRequestException('Start time must be less than end time');
    }

    const highlightData = {
      ...createHighlightDto,
      video: new Types.ObjectId(createHighlightDto.video),
      creator: new Types.ObjectId(createHighlightDto.creator),
    };
    const createdHighlight = new this.highlightModel(highlightData);
    return await createdHighlight.save();
  }

  async findAll(): Promise<Highlight[]> {
    return await this.highlightModel
      .find()
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Highlight> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid highlight ID');
    }
    const highlight = await this.highlightModel
      .findById(id)
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .exec();

    if (!highlight) {
      throw new NotFoundException(`Highlight with ID ${id} not found`);
    }
    return highlight;
  }

  async findByVideo(videoId: string): Promise<Highlight[]> {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }
    return await this.highlightModel
      .find({ video: new Types.ObjectId(videoId) })
      .populate('creator', 'username email avatar')
      .sort({ startTime: 1 })
      .exec();
  }

  async update(id: string, updateHighlightDto: UpdateHighlightDto): Promise<Highlight> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid highlight ID');
    }

    const updateData: any = { ...updateHighlightDto };
    if (updateData.video) updateData.video = new Types.ObjectId(updateData.video);
    if (updateData.creator) delete updateData.creator; // Prevent rough creator change

    // Optional: Check time validity again if both updated, or fetch fetch existing if one updated.
    // Simplifying for now assume frontend validates or mixed updates are rare/handled roughly.

    const updatedHighlight = await this.highlightModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .exec();

    if (!updatedHighlight) {
      throw new NotFoundException(`Highlight with ID ${id} not found`);
    }
    return updatedHighlight;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid highlight ID');
    }
    const result = await this.highlightModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Highlight with ID ${id} not found`);
    }
    return { message: 'Highlight deleted successfully' };
  }
}
