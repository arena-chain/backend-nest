import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { Stream, StreamDocument } from './entities/stream.entity';
import { ChannelService } from '../channel/channel.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationCategory } from '../notification/entities/notification.entity';

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    private readonly channelService: ChannelService,
    private readonly notificationService: NotificationService,
  ) { }

  private buildMeteredCredentialsUrl() {
    const directUrl = process.env.METERED_TURN_CREDENTIALS_URL?.trim();
    if (directUrl) {
      return directUrl;
    }

    const rawDomain = process.env.METERED_TURN_DOMAIN?.trim();
    const apiKey = process.env.METERED_TURN_API_KEY?.trim();

    if (!rawDomain || !apiKey) {
      return '';
    }

    const normalizedDomain = rawDomain
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');

    return `https://${normalizedDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
  }

  async getRtcConfig() {
    const meteredTurnCredentialsUrl = this.buildMeteredCredentialsUrl();

    if (meteredTurnCredentialsUrl) {
      try {
        const response = await fetch(meteredTurnCredentialsUrl);

        if (response.ok) {
          const meteredIceServers = await response.json() as Array<{ urls: string | string[]; username?: string; credential?: string }>;

          if (Array.isArray(meteredIceServers) && meteredIceServers.length > 0) {
            return {
              iceServers: meteredIceServers,
              hasTurn: true,
              provider: 'metered',
            };
          }
        } else {
          this.logger.warn(`Metered TURN credentials request failed: ${response.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Metered TURN error';
        this.logger.warn(`Metered TURN credentials fetch failed: ${message}`);
      }
    }

    const turnUrls = (process.env.TURN_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_CREDENTIAL || '',
      });
    }

    return {
      iceServers,
      hasTurn: turnUrls.length > 0,
      provider: turnUrls.length > 0 ? 'custom' : 'stun-only',
    };
  }

  private extractId(value: any): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value._id) {
      return value._id.toString();
    }

    return value.toString();
  }

  async create(streamerId: string, createStreamDto: CreateStreamDto): Promise<StreamDocument> {
    const channel = await this.channelService.findOne(createStreamDto.channelId);

    if (this.extractId(channel.ownerId) !== streamerId) {
      throw new ForbiddenException('You can only create streams for your own channel');
    }

    const stream = new this.streamModel({
      ...createStreamDto,
      streamerId: new Types.ObjectId(streamerId),
      channelId: new Types.ObjectId(createStreamDto.channelId),
      streamUrl: createStreamDto.streamUrl || createStreamDto.playbackUrl,
      playbackUrl: createStreamDto.playbackUrl || createStreamDto.streamUrl,
      viewerCount: 0,
      startedAt: createStreamDto.isLive ? new Date() : undefined,
      endedAt: createStreamDto.isLive ? undefined : new Date(),
    });
    const saved = await stream.save();
    this.logger.log(`Stream created: stream=${saved._id.toString()} channel=${createStreamDto.channelId} user=${streamerId}`);

    // Notify subscribers if scheduled
    if (saved.scheduledStartTime) {
      const populated = await saved.populate([
        { path: 'streamerId', select: 'nickname' },
        { path: 'channelId', select: 'name subscribers' },
      ]);
      const streamerNickname = (populated.streamerId as any).nickname || 'A streamer';
      const subscribers = (populated.channelId as any).subscribers || [];

      if (subscribers.length > 0) {
        await this.notificationService.notifyChannelSubscribers(
          subscribers,
          streamerNickname,
          'New Stream Scheduled',
          `has scheduled a new stream: "${saved.title}"`,
          NotificationCategory.STREAMS,
          `/watch/${saved.channelId}`,
        );
      }
    }

    return saved.populate([
      { path: 'streamerId', select: 'email nickname' },
      { path: 'channelId', select: 'name ownerId avatarUrl' },
    ]);
  }

  async findAll(): Promise<StreamDocument[]> {
    return this.streamModel.find().populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl').sort({ createdAt: -1 }).exec();
  }

  async findMine(streamerId: string): Promise<StreamDocument[]> {
    return this.streamModel.find({ streamerId: new Types.ObjectId(streamerId) }).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl').sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<StreamDocument> {
    const stream = await this.streamModel.findById(id).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl').exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    return stream;
  }

  async findByStreamer(streamerId: string): Promise<StreamDocument[]> {
    return this.streamModel.find({ streamerId: new Types.ObjectId(streamerId) }).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl').sort({ createdAt: -1 }).exec();
  }

  async findByChannel(channelId: string): Promise<StreamDocument[]> {
    const objectId = Types.ObjectId.isValid(channelId) ? new Types.ObjectId(channelId) : null;
    const query = objectId
      ? { $or: [{ channelId: objectId }, { channelId }] }
      : { channelId };

    const results = await this.streamModel
      .find(query)
      .populate('streamerId', 'email nickname')
      .populate('channelId', 'name ownerId avatarUrl')
      .sort({ createdAt: -1 })
      .exec();
    this.logger.log(`findByChannel: channel=${channelId} results=${results.length}`);
    return results;
  }

  async findLiveStreams(): Promise<StreamDocument[]> {
    return this.streamModel.find({ isLive: true }).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl').sort({ startedAt: -1 }).exec();
  }

  async update(id: string, streamerId: string, updateStreamDto: UpdateStreamDto): Promise<StreamDocument> {
    const existing = await this.findOne(id);

    if (this.extractId(existing.streamerId) !== streamerId) {
      throw new ForbiddenException('You can only update your own stream');
    }

    const stream = await this.streamModel.findByIdAndUpdate(
      id,
      {
        ...updateStreamDto,
        streamUrl: updateStreamDto.streamUrl || updateStreamDto.playbackUrl || existing.streamUrl,
        playbackUrl: updateStreamDto.playbackUrl || updateStreamDto.streamUrl || existing.playbackUrl,
      },
      { new: true },
    ).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl subscribers').exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    // Notify subscribers if scheduled and it's a new or changed schedule
    if (stream.scheduledStartTime && stream.scheduledStartTime !== existing.scheduledStartTime) {
      const streamerNickname = (stream.streamerId as any).nickname || 'A streamer';
      const subscribers = (stream.channelId as any).subscribers || [];

      if (subscribers.length > 0) {
        await this.notificationService.notifyChannelSubscribers(
          subscribers,
          streamerNickname,
          'Stream Schedule Updated',
          `has scheduled/updated a stream: "${stream.title}"`,
          NotificationCategory.STREAMS,
          `/watch/${stream.channelId._id}`,
        );
      }
    }

    return stream;
  }

  async start(id: string, streamerId: string): Promise<StreamDocument> {
    const existing = await this.findOne(id);

    if (this.extractId(existing.streamerId) !== streamerId) {
      throw new ForbiddenException('You can only start your own stream');
    }

    const stream = await this.streamModel.findByIdAndUpdate(
      id,
      {
        isLive: true,
        startedAt: existing.startedAt || new Date(),
        endedAt: undefined,
      },
      { new: true },
    ).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl subscribers').exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    this.logger.log(`Stream started: stream=${id} user=${streamerId}`);

    // Update channel status
    const channelId = (stream.channelId as any)._id?.toString() || stream.channelId.toString();
    await this.channelService.updateStatus(channelId, true, stream.viewerCount || 0);

    // Notify subscribers that we are LIVE
    const subscribers = (stream.channelId as any).subscribers || [];
    const streamerNickname = (stream.streamerId as any).nickname || 'A streamer';

    if (subscribers.length > 0) {
      await this.notificationService.notifyChannelSubscribers(
        subscribers,
        streamerNickname,
        '🔴 LIVE NOW',
        `is now live: "${stream.title}"`,
        NotificationCategory.STREAMS,
        `/watch/${stream.channelId._id}`,
      );
    }

    return stream;
  }

  async end(id: string, streamerId: string): Promise<StreamDocument> {
    const existing = await this.findOne(id);

    if (this.extractId(existing.streamerId) !== streamerId) {
      throw new ForbiddenException('You can only end your own stream');
    }

    const stream = await this.streamModel.findByIdAndUpdate(
      id,
      {
        isLive: false,
        endedAt: new Date(),
      },
      { new: true },
    ).populate('streamerId', 'email nickname').populate('channelId', 'name ownerId avatarUrl').exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    this.logger.log(`Stream ended: stream=${id} user=${streamerId}`);

    // Update channel status
    const channelId = (stream.channelId as any)._id?.toString() || stream.channelId.toString();
    await this.channelService.updateStatus(channelId, false, 0);

    return stream;
  }

  async remove(id: string, streamerId: string): Promise<StreamDocument> {
    const existing = await this.findOne(id);

    if (this.extractId(existing.streamerId) !== streamerId) {
      throw new ForbiddenException('You can only delete your own stream');
    }

    const stream = await this.streamModel.findByIdAndDelete(id).exec();

    if (!stream) {
      throw new NotFoundException(`Stream with ID ${id} not found`);
    }

    return stream;
  }
}
