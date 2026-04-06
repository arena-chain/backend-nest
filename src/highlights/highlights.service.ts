import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import {
  Highlight,
  HighlightDocument,
  HighlightVisibility,
} from './schemas/highlight.schema';
import { Video, VideoDocument } from '../video/schema/video.schema';

@Injectable()
export class HighlightsService {
  constructor(
    @InjectModel(Highlight.name)
    private readonly highlightModel: Model<HighlightDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  /**
   * Multer stores URLs like `/uploads/videos/file.mp4`. On Unix, that string is
   * `path.isAbsolute` true, but it is NOT a filesystem root path — FFmpeg must
   * read under `process.cwd()/uploads/...`.
   */
  private resolveVideoPathForFfmpeg(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const relative = url.startsWith('/') ? url.slice(1) : url;
      return path.join(process.cwd(), relative);
    }
    if (path.isAbsolute(url)) {
      return url;
    }
    return path.join(process.cwd(), url);
  }

  // Generate a clip using FFmpeg
  async generateClip(
    inputPath: string,
    start: number,
    duration: number,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(duration)
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => reject(err))
        .run();
    });
  }

  // Fake detection: return 3 highlights (replace later with AI)
  detectHighlights(video: VideoDocument) {
    // duration is in seconds
    const highlights: { start: number; duration: number }[] = [];
    const interval = Math.min(20, Math.floor((video.duration || 120) / 3));
    for (let i = 0; i < 3; i++) {
      highlights.push({ start: i * interval, duration: interval });
    }
    return highlights;
  }

  // Process video: detect + generate + save highlights
  async processVideo(
    video: VideoDocument,
    uploaderId: string,
    options?: { visibility?: HighlightVisibility },
  ) {
    const videoId = video._id as Types.ObjectId;
    const visibility =
      options?.visibility ?? HighlightVisibility.PRIVATE;
    const highlights = this.detectHighlights(video);

    const clipsDir = path.join(process.cwd(), 'uploads', 'clips');
    fs.mkdirSync(clipsDir, { recursive: true });

    const inputPath = this.resolveVideoPathForFfmpeg(video.url);

    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      const fileName = `${videoId.toString()}_${i}.mp4`;
      const outputPath = path.join(clipsDir, fileName);
      const clipUrl = path.posix.join('uploads', 'clips', fileName);

      await this.generateClip(inputPath, h.start, h.duration, outputPath);

      await this.highlightModel.create({
        title: `Highlight ${i + 1}`,
        video: videoId,
        startTime: h.start,
        endTime: h.start + h.duration,
        creator: new Types.ObjectId(uploaderId),
        clipUrl,
        visibility,
      });
    }
  }

  /** Load video from DB then run highlight pipeline (for HTTP handlers / worker). */
  async processVideoById(
    videoId: string,
    uploaderId: string,
    options?: { visibility?: HighlightVisibility },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(videoId))
      throw new BadRequestException('Invalid video ID');
    if (!Types.ObjectId.isValid(uploaderId))
      throw new BadRequestException('Invalid uploader ID');

    const video = await this.videoModel.findById(videoId).exec();
    if (!video) throw new NotFoundException('Video not found');

    await this.processVideo(video, uploaderId, options);
  }

  // CRUD operations

  async create(data: Partial<Highlight>): Promise<Highlight> {
    if (
      data.startTime === undefined ||
      data.endTime === undefined ||
      data.startTime >= data.endTime
    ) {
      throw new BadRequestException('Start time must be less than end time');
    }
    if (data.video === undefined || data.creator === undefined) {
      throw new BadRequestException('video and creator are required');
    }
    if (!data.clipUrl) {
      throw new BadRequestException('clipUrl is required for manual highlight creation');
    }
    const highlight = new this.highlightModel({
      ...data,
      video: new Types.ObjectId(String(data.video)),
      creator: new Types.ObjectId(String(data.creator)),
      visibility: data.visibility ?? HighlightVisibility.PRIVATE,
    });
    return highlight.save();
  }

  async findAll(): Promise<Highlight[]> {
    return this.highlightModel
      .find()
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Feed / discovery: only public highlights */
  async findPublic(): Promise<Highlight[]> {
    return this.highlightModel
      .find({ visibility: HighlightVisibility.PUBLIC })
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Highlight> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel
      .findById(id)
      .populate('video', 'title url thumbnailUrl duration')
      .populate('creator', 'username email avatar')
      .exec();
    if (!doc) throw new BadRequestException('Highlight not found');
    return doc;
  }

  async findByVideo(
    videoId: string,
    opts?: { publicOnly?: boolean },
  ): Promise<Highlight[]> {
    if (!Types.ObjectId.isValid(videoId))
      throw new BadRequestException('Invalid video ID');

    const filter: Record<string, unknown> = {
      video: new Types.ObjectId(videoId),
    };
    if (opts?.publicOnly) {
      filter.visibility = HighlightVisibility.PUBLIC;
    }

    return this.highlightModel
      .find(filter)
      .populate('creator', 'username email avatar')
      .sort({ startTime: 1 })
      .exec();
  }

  async updateVisibility(
    highlightId: string,
    requesterUserId: string,
    visibility: HighlightVisibility,
  ): Promise<Highlight> {
    if (!Types.ObjectId.isValid(highlightId))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel.findById(highlightId).exec();
    if (!doc) throw new NotFoundException('Highlight not found');

    const creatorId = doc.creator.toString();
    if (creatorId !== requesterUserId) {
      throw new BadRequestException('Only the creator can change visibility');
    }

    doc.visibility = visibility;
    return doc.save();
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid highlight ID');

    const result = await this.highlightModel.findByIdAndDelete(id).exec();
    if (!result) throw new BadRequestException('Highlight not found');
    return { message: 'Highlight deleted successfully' };
  }

  async removeForOwner(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Highlight not found');
    if (doc.creator.toString() !== userId) {
      throw new ForbiddenException('Only the creator can delete this highlight');
    }
    return this.remove(id);
  }

  async updateDetails(
    highlightId: string,
    requesterUserId: string,
    patch: { title?: string; description?: string },
  ): Promise<Highlight> {
    if (!Types.ObjectId.isValid(highlightId))
      throw new BadRequestException('Invalid highlight ID');

    const doc = await this.highlightModel.findById(highlightId).exec();
    if (!doc) throw new NotFoundException('Highlight not found');
    if (doc.creator.toString() !== requesterUserId) {
      throw new ForbiddenException('Only the creator can edit this highlight');
    }

    if (patch.title !== undefined) doc.title = patch.title;
    if (patch.description !== undefined) doc.description = patch.description;
    return doc.save();
  }
}