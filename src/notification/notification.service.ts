import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationCategory,
} from './entities/notification.entity';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
} from './entities/notification-preferences.entity';
import {
  CreateNotificationDto,
  NotificationType,
} from './dto/create-notification.dto';
import {
  NotificationPreferencesDto,
  RegisterDeviceTokenDto,
} from './dto/notification-preferences.dto';
import { NotificationsGateway } from './notifications.gateway';
import { forwardRef, Inject } from '@nestjs/common';

const ARCHIVE_THRESHOLD = 100;

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreferences.name)
    private readonly prefsModel: Model<NotificationPreferencesDocument>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  // ─── Create ─────────────────────────────────────────────────────────
  async createForUser(
    dto: CreateNotificationDto,
  ): Promise<NotificationDocument | null> {
    const userId = new Types.ObjectId(dto.userId);

    // Check preferences — skip if category is disabled
    const isSecurity = dto.category === NotificationCategory.SECURITY;
    if (!isSecurity) {
      const prefs = await this.prefsModel.findOne({ userId }).lean().exec();
      if (prefs && dto.category && prefs[dto.category] === false) {
        return null; // User has opted out
      }
    }

    // Create notification
    const notif = await this.notifModel.create({
      userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      category: dto.category ?? NotificationCategory.SYSTEM,
      link: dto.link,
      resourceDeleted: dto.resourceDeleted ?? false,
      metadata: dto.metadata ?? {},
    });

    // Auto-archive if more than ARCHIVE_THRESHOLD active notifications
    const count = await this.notifModel.countDocuments({
      userId,
      archived: false,
    });
    if (count > ARCHIVE_THRESHOLD) {
      const oldest = await this.notifModel
        .find({ userId, archived: false })
        .sort({ createdAt: 1 })
        .limit(count - ARCHIVE_THRESHOLD)
        .select('_id')
        .lean()
        .exec();
      const ids = oldest.map((n) => n._id);
      await this.notifModel.updateMany(
        { _id: { $in: ids } },
        { archived: true },
      );
    }

    if (notif) {
      this.gateway.emitToUser(userId.toString(), notif);
    }

    return notif;
  }

  // ─── List ────────────────────────────────────────────────────────────
  async findAllForUser(userId: string, includeArchived = false) {
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (!includeArchived) query.archived = false;
    return this.notifModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
      archived: false,
    });
  }

  // ─── Read ─────────────────────────────────────────────────────────────
  async markAsRead(id: string, userId: string) {
    return this.notifModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { isRead: true },
      { new: true },
    );
  }

  async markAllAsRead(userId: string) {
    return this.notifModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
  }

  // ─── Delete ───────────────────────────────────────────────────────────
  async deleteOne(id: string, userId: string) {
    return this.notifModel.findOneAndDelete({
      _id: id,
      userId: new Types.ObjectId(userId),
    });
  }

  async clearAll(userId: string) {
    return this.notifModel.deleteMany({ userId: new Types.ObjectId(userId) });
  }

  // ─── Preferences ─────────────────────────────────────────────────────
  async getPreferences(userId: string) {
    const prefs = await this.prefsModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!prefs) {
      // Return defaults
      return {
        matches: true,
        leagues: true,
        social: true,
        achievements: true,
        streams: true,
        security: true,
        emailEnabled: true,
        emailMatches: true,
        emailLeagues: true,
        emailSocial: false,
        emailAchievements: true,
        emailStreams: false,
        pushEnabled: true,
      };
    }
    return prefs;
  }

  async savePreferences(userId: string, dto: NotificationPreferencesDto) {
    const { ...rest } = dto;
    // Enforce: security cannot be disabled
    return this.prefsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { ...rest, security: true },
      { upsert: true, new: true },
    );
  }

  // ─── Device Token (NOTIF-103) ─────────────────────────────────────────
  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    return this.prefsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { pushToken: dto.token, pushPlatform: dto.platform, pushEnabled: true },
      { upsert: true, new: true },
    );
  }

  // ─── Stream Events (Fan-out to subscribers) ───────────────────────────
  async notifyChannelSubscribers(
    subscriberIds: (string | Types.ObjectId)[],
    streamerNickname: string,
    title: string,
    message: string,
    category: NotificationCategory,
    link: string,
    metadata: Record<string, any> = {},
  ) {
    const results: NotificationDocument[] = [];
    for (const subId of subscriberIds) {
      const userId = subId.toString();
      const notif = await this.createForUser({
        userId,
        title,
        message: `${streamerNickname}: ${message}`,
        type: NotificationType.STREAM_EVENT,
        category,
        link,
        metadata,
      });

      if (notif) {
        results.push(notif);
      }
    }
    return results;
  }
}
