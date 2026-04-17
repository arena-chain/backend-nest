import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';
import { UsersService } from '../user/user.service';

type JoinPayload = {
  channelId: string;
  role: 'broadcaster' | 'viewer';
};

type SignalPayload = {
  targetId: string;
  channelId: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type ChatMessagePayload = {
  channelId: string;
  message: string;
};

type ReactionPayload = {
  channelId: string;
  emoji: string;
};

type LiveSocketUser = {
  userId?: string;
  nickname: string;
  role: string;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) { }

  private readonly logger = new Logger(StreamGateway.name);
  private readonly broadcasterByChannel = new Map<string, string>();
  private readonly socketChannel = new Map<string, string>();
  private readonly socketRole = new Map<string, 'broadcaster' | 'viewer'>();
  private readonly reactionsByChannel = new Map<string, Map<string, Set<string>>>();

  private async authenticateSocket(socket: Socket) {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.data.user = {
        nickname: `Guest-${socket.id.slice(0, 4)}`,
        role: 'guest',
      } satisfies LiveSocketUser;
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.usersService.findById(payload.sub);
      socket.data.user = {
        userId: user._id.toString(),
        nickname: user.nickname,
        role: user.role,
      } satisfies LiveSocketUser;
    } catch {
      socket.data.user = {
        nickname: `Guest-${socket.id.slice(0, 4)}`,
        role: 'guest',
      } satisfies LiveSocketUser;
      this.logger.warn(`socket auth failed ${socket.id}`);
    }
  }

  private getReactionSummary(channelId: string) {
    const channelReactions = this.reactionsByChannel.get(channelId);
    if (!channelReactions) return {};

    const summary: Record<string, number> = {};
    for (const [emoji, userSet] of channelReactions.entries()) {
      summary[emoji] = userSet.size;
    }
    return summary;
  }

  private toggleReaction(channelId: string, emoji: string, userId: string) {
    let channelReactions = this.reactionsByChannel.get(channelId);
    if (!channelReactions) {
      channelReactions = new Map();
      this.reactionsByChannel.set(channelId, channelReactions);
    }

    let userSet = channelReactions.get(emoji);
    if (!userSet) {
      userSet = new Set();
      channelReactions.set(emoji, userSet);
    }

    if (userSet.has(userId)) {
      userSet.delete(userId);
    } else {
      userSet.add(userId);
    }

    return this.getReactionSummary(channelId);
  }

  async handleConnection(socket: Socket) {
    await this.authenticateSocket(socket);
    this.logger.log(`socket connected ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    const channelId = this.socketChannel.get(socket.id);
    const role = this.socketRole.get(socket.id);

    if (channelId && role === 'broadcaster' && this.broadcasterByChannel.get(channelId) === socket.id) {
      this.broadcasterByChannel.delete(channelId);
      this.server.to(channelId).emit('broadcast-ended', { channelId });
      this.server.to(channelId).emit('broadcaster-status', { channelId, isBroadcasting: false });
      this.logger.log(`broadcaster disconnected channel=${channelId}`);
    }

    if (channelId && role === 'viewer') {
      const broadcasterId = this.broadcasterByChannel.get(channelId);
      if (broadcasterId) {
        this.server.to(broadcasterId).emit('viewer-left', {
          viewerId: socket.id,
          channelId,
        });
      }
    }

    this.socketChannel.delete(socket.id);
    this.socketRole.delete(socket.id);
    this.logger.log(`socket disconnected ${socket.id}`);
  }

  @SubscribeMessage('join-channel')
  joinChannel(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    socket.join(payload.channelId);
    this.socketChannel.set(socket.id, payload.channelId);
    this.socketRole.set(socket.id, payload.role);

    if (payload.role === 'broadcaster') {
      this.broadcasterByChannel.set(payload.channelId, socket.id);
      this.server.to(payload.channelId).emit('broadcaster-status', {
        channelId: payload.channelId,
        isBroadcasting: true,
      });
      this.logger.log(`broadcaster joined channel=${payload.channelId} socket=${socket.id}`);
      return { ok: true, role: payload.role };
    }

    const broadcasterId = this.broadcasterByChannel.get(payload.channelId);
    if (broadcasterId) {
      this.server.to(broadcasterId).emit('viewer-joined', {
        viewerId: socket.id,
        channelId: payload.channelId,
      });
      this.server.to(socket.id).emit('broadcaster-status', {
        channelId: payload.channelId,
        isBroadcasting: true,
      });
    }

    this.server.to(socket.id).emit('reaction-summary', {
      channelId: payload.channelId,
      counts: this.getReactionSummary(payload.channelId),
    });

    this.logger.log(`viewer joined channel=${payload.channelId} socket=${socket.id}`);
    return { ok: true, role: payload.role, hasBroadcaster: !!broadcasterId };
  }

  @SubscribeMessage('leave-channel')
  leaveChannel(@ConnectedSocket() socket: Socket) {
    const channelId = this.socketChannel.get(socket.id);
    if (!channelId) {
      return { ok: true };
    }

    socket.leave(channelId);
    this.handleDisconnect(socket);
    return { ok: true };
  }

  @SubscribeMessage('signal-offer')
  signalOffer(@ConnectedSocket() socket: Socket, @MessageBody() payload: SignalPayload) {
    this.server.to(payload.targetId).emit('signal-offer', {
      sourceId: socket.id,
      channelId: payload.channelId,
      description: payload.description,
    });
  }

  @SubscribeMessage('signal-answer')
  signalAnswer(@ConnectedSocket() socket: Socket, @MessageBody() payload: SignalPayload) {
    this.server.to(payload.targetId).emit('signal-answer', {
      sourceId: socket.id,
      channelId: payload.channelId,
      description: payload.description,
    });
  }

  @SubscribeMessage('ice-candidate')
  iceCandidate(@ConnectedSocket() socket: Socket, @MessageBody() payload: SignalPayload) {
    this.server.to(payload.targetId).emit('ice-candidate', {
      sourceId: socket.id,
      channelId: payload.channelId,
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('chat-message')
  async chatMessage(@ConnectedSocket() socket: Socket, @MessageBody() payload: ChatMessagePayload) {
    const user = socket.data.user as LiveSocketUser | null;
    const message = payload.message?.trim();
    if (!payload.channelId || !message) {
      return { ok: false };
    }

    const created = user?.userId
      ? await this.chatService.createForUser(user.userId, {
        channelId: payload.channelId,
        message,
      })
      : await this.chatService.createAnonymous(
        {
          channelId: payload.channelId,
          message,
        },
        user?.nickname || `Guest-${socket.id.slice(0, 4)}`,
      );

    this.server.to(payload.channelId).emit('chat-message', created);
    return { ok: true };
  }

  @SubscribeMessage('reaction')
  reaction(@ConnectedSocket() socket: Socket, @MessageBody() payload: ReactionPayload) {
    const user = socket.data.user as LiveSocketUser | null;
    if (!payload.channelId || !payload.emoji) {
      return { ok: false };
    }

    const counts = this.toggleReaction(
      payload.channelId,
      payload.emoji,
      user?.userId || socket.id
    );

    this.server.to(payload.channelId).emit('reaction-event', {
      channelId: payload.channelId,
      emoji: payload.emoji,
      senderNickname: user?.nickname || `Guest-${socket.id.slice(0, 4)}`,
      createdAt: new Date().toISOString(),
    });
    this.server.to(payload.channelId).emit('reaction-summary', {
      channelId: payload.channelId,
      counts,
    });

    return { ok: true };
  }
}
