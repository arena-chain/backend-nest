import { Injectable, Logger } from '@nestjs/common';
import { FriendshipService } from '../friendship/friendship.service';

export enum UserStatus {
  ONLINE = 'online',
  IN_GAME = 'in_game',
  IN_QUEUE = 'in_queue',
  AWAY = 'away',
  OFFLINE = 'offline',
}

export interface PresenceEntry {
  userId: string;
  socketId: string;
  status: UserStatus;
  game?: string;
  details?: string;
  connectedAt: number;
  lastActivity: number;
}

export interface FriendPresence {
  userId: string;
  nickname: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  game?: string;
  details?: string;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  private readonly onlineUsers = new Map<string, PresenceEntry>();
  private readonly socketToUser = new Map<string, string>();

  constructor(private readonly friendshipService: FriendshipService) {}

  addUser(userId: string, socketId: string): PresenceEntry {
    const existing = this.onlineUsers.get(userId);
    if (existing) {
      this.socketToUser.delete(existing.socketId);
    }

    const entry: PresenceEntry = {
      userId,
      socketId,
      status: UserStatus.ONLINE,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.onlineUsers.set(userId, entry);
    this.socketToUser.set(socketId, userId);
    this.logger.log(`user online: ${userId}`);
    return entry;
  }

  removeBySocket(socketId: string): string | null {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return null;

    const entry = this.onlineUsers.get(userId);
    if (entry && entry.socketId === socketId) {
      this.onlineUsers.delete(userId);
    }
    this.socketToUser.delete(socketId);
    this.logger.log(`user offline: ${userId}`);
    return userId;
  }

  getUserIdBySocket(socketId: string): string | null {
    return this.socketToUser.get(socketId) || null;
  }

  updateStatus(
    userId: string,
    status: UserStatus,
    game?: string,
    details?: string,
  ): PresenceEntry | null {
    const entry = this.onlineUsers.get(userId);
    if (!entry) return null;

    entry.status = status;
    entry.game = game;
    entry.details = details;
    entry.lastActivity = Date.now();
    return entry;
  }

  getStatus(userId: string): PresenceEntry | null {
    return this.onlineUsers.get(userId) || null;
  }

  async getFriendsPresence(userId: string): Promise<FriendPresence[]> {
    const friendDocs = await this.friendshipService.getFriends(userId);

    return friendDocs.map((doc: any) => {
      const isRequester =
        (doc.requesterId?._id?.toString() || doc.requesterId?.toString()) ===
        userId;
      const other = isRequester ? doc.recipientId : doc.requesterId;
      const otherId = other?._id?.toString() || other?.toString();
      const presence = this.onlineUsers.get(otherId);

      return {
        userId: otherId,
        nickname: other?.nickname || 'Unknown',
        email: other?.email || '',
        avatar: other?.avatar || null,
        status: presence?.status || UserStatus.OFFLINE,
        game: presence?.game,
        details: presence?.details,
      };
    });
  }

  async getFriendSocketIds(userId: string): Promise<string[]> {
    const friendDocs = await this.friendshipService.getFriends(userId);

    const socketIds: string[] = [];
    for (const doc of friendDocs as any[]) {
      const isRequester =
        (doc.requesterId?._id?.toString() || doc.requesterId?.toString()) ===
        userId;
      const other = isRequester ? doc.recipientId : doc.requesterId;
      const otherId = other?._id?.toString() || other?.toString();
      const entry = this.onlineUsers.get(otherId);
      if (entry) socketIds.push(entry.socketId);
    }
    return socketIds;
  }

  getOnlineCount(): number {
    return this.onlineUsers.size;
  }
}
