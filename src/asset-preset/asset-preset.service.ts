import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AssetPreset,
  AssetPresetDocument,
} from './schemas/asset-preset.schema';
import { CreateAssetPresetDto } from './dto/create-asset-preset.dto';
import { UpdateAssetPresetDto } from './dto/update-asset-preset.dto';

@Injectable()
export class AssetPresetService {
  constructor(
    @InjectModel(AssetPreset.name)
    private presetModel: Model<AssetPresetDocument>,
  ) {}

  async create(
    userId: string,
    dto: CreateAssetPresetDto,
  ): Promise<AssetPresetDocument> {
    return this.presetModel.create({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      baseNftId: dto.baseNftId ? new Types.ObjectId(dto.baseNftId) : undefined,
      assetPath: dto.assetPath,
      config: dto.config ?? {},
      previewImageUrl: dto.previewImageUrl,
    });
  }

  async findMine(userId: string): Promise<AssetPresetDocument[]> {
    return this.presetModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('baseNftId', 'name category imageUrl metadata compatibleGames')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<AssetPresetDocument> {
    const doc = await this.presetModel
      .findById(id)
      .populate('baseNftId', 'name category imageUrl metadata compatibleGames')
      .exec();
    if (!doc) throw new NotFoundException('Preset not found');
    if (doc.userId.toString() !== userId)
      throw new ForbiddenException('Not your preset');
    return doc;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAssetPresetDto,
  ): Promise<AssetPresetDocument> {
    await this.findOne(userId, id);
    const update: any = { ...dto };
    if (dto.baseNftId !== undefined) {
      update.baseNftId = dto.baseNftId
        ? new Types.ObjectId(dto.baseNftId)
        : null;
    }
    const doc = await this.presetModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    if (!doc) throw new NotFoundException('Preset not found');
    return doc;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.presetModel.findByIdAndDelete(id).exec();
  }
}
