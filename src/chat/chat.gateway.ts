import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** groupId -> userIds currently in voice room */
  private readonly voiceUsersByGroup = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  private stripBearer(raw: unknown): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (s.startsWith('Bearer ')) {
      return s.slice(7).trim() || null;
    }
    return s;
  }

  private async authenticate(socket: Socket): Promise<string | null> {
    const token = this.stripBearer(socket.handshake.auth?.token);
    if (!token) {
      this.logger.warn(`chat auth missing token: ${socket.id}`);
      return null;
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const sub = payload?.sub ?? payload?.userId;
      return typeof sub === 'string' ? sub : sub != null ? String(sub) : null;
    } catch (e) {
      this.logger.warn(`chat auth failed: ${socket.id} (${e instanceof Error ? e.message : e})`);
      return null;
    }
  }

  async handleConnection(socket: Socket) {
    const userId = await this.authenticate(socket);
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    socket.data.userId = userId;
    await socket.join(userId);
    this.logger.log(`chat connected: ${userId} (${socket.id})`);
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;

    for (const [groupId, set] of this.voiceUsersByGroup.entries()) {
      if (set.has(userId)) {
        set.delete(userId);
        this.server.to(`voice:${groupId}`).emit('user-left', { userId, groupId });
        if (set.size === 0) {
          this.voiceUsersByGroup.delete(groupId);
        }
      }
    }
    this.logger.log(`chat disconnected: ${userId} (${socket.id})`);
  }

  @SubscribeMessage('join-room')
  joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { room?: string; channelId?: string },
  ) {
    const room = body?.room || body?.channelId;
    if (!room) return { ok: false };
    void socket.join(room);
    socket.to(room).emit('user-joined', { userId: socket.data.userId, room });
    return { ok: true, room };
  }

  @SubscribeMessage('leave-room')
  leaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { room?: string; channelId?: string },
  ) {
    const room = body?.room || body?.channelId;
    if (!room) return { ok: false };
    void socket.leave(room);
    socket.to(room).emit('user-left', { userId: socket.data.userId, room });
    return { ok: true };
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { channelId: string; message: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.channelId || !body?.message?.trim()) {
      return { ok: false };
    }
    const created = await this.chatService.createForUser(userId, {
      channelId: body.channelId,
      message: body.message,
    });
    this.server.to(body.channelId).emit('new-message', created);
    return { ok: true, message: created };
  }

  @SubscribeMessage('sendPrivateMessage')
  async sendPrivateMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { receiverId: string; message: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.receiverId || !body?.message?.trim()) {
      return { ok: false };
    }
    const created = await this.chatService.createPrivateMessage(
      userId,
      body.receiverId,
      body.message,
    );
    this.server.to(body.receiverId).emit('newPrivateMessage', created);
    this.server.to(userId).emit('newPrivateMessage', created);
    return { ok: true, message: created };
  }

  @SubscribeMessage('joinGroupRoom')
  async joinGroupRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.groupId) return { ok: false };
    try {
      await this.chatService.assertGroupMember(body.groupId, userId);
    } catch {
      return { ok: false, error: 'not_member' };
    }
    const room = `group:${body.groupId}`;
    await socket.join(room);
    socket.to(room).emit('user-joined', { userId, groupId: body.groupId });
    return { ok: true, groupId: body.groupId };
  }

  @SubscribeMessage('sendGroupMessage')
  async sendGroupMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { groupId: string; message: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.groupId || !body?.message?.trim()) {
      return { ok: false };
    }
    try {
      const created = await this.chatService.createGroupMessage(
        userId,
        body.groupId,
        body.message,
      );
      const room = `group:${body.groupId}`;
      this.server.to(room).emit('newGroupMessage', created);
      return { ok: true, message: created };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  @SubscribeMessage('deleteMessage')
  async deleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.messageId) return { ok: false };
    try {
      const res = await this.chatService.deleteMessage(body.messageId, userId);
      const payload = { messageId: body.messageId };
      const targets = new Set<string>([userId]);
      if (res.receiverId) targets.add(res.receiverId);
      if (res.senderId) targets.add(res.senderId);
      for (const id of targets) {
        this.server.to(id).emit('messageDeleted', payload);
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('deleteConversation')
  async deleteConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { userId: string },
  ) {
    const selfId = socket.data.userId as string;
    const otherId = body?.userId;
    if (!otherId) return { ok: false };
    await this.chatService.deleteConversation(selfId, otherId);
    const payload = { conversationWith: otherId, all: true };
    this.server.to(selfId).emit('messageDeleted', payload);
    this.server.to(otherId).emit('messageDeleted', {
      conversationWith: selfId,
      all: true,
    });
    return { ok: true };
  }

  @SubscribeMessage('joinVoiceRoom')
  async joinVoiceRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.groupId) return { ok: false };
    try {
      await this.chatService.assertGroupMember(body.groupId, userId);
    } catch {
      return { ok: false, error: 'not_member' };
    }
    const voiceRoom = `voice:${body.groupId}`;
    await socket.join(voiceRoom);
    let set = this.voiceUsersByGroup.get(body.groupId);
    if (!set) {
      set = new Set();
      this.voiceUsersByGroup.set(body.groupId, set);
    }
    set.add(userId);
    socket.to(voiceRoom).emit('user-joined', { userId, groupId: body.groupId, voice: true });
    return { ok: true };
  }

  @SubscribeMessage('leaveVoiceRoom')
  async leaveVoiceRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { groupId: string },
  ) {
    const userId = socket.data.userId as string;
    if (!body?.groupId) return { ok: false };
    const voiceRoom = `voice:${body.groupId}`;
    const set = this.voiceUsersByGroup.get(body.groupId);
    if (set) {
      set.delete(userId);
      if (set.size === 0) {
        this.voiceUsersByGroup.delete(body.groupId);
      }
    }
    socket.to(voiceRoom).emit('user-left', { userId, groupId: body.groupId, voice: true });
    await socket.leave(voiceRoom);
    return { ok: true };
  }

  @SubscribeMessage('getVoiceRoomUsers')
  getVoiceRoomUsers(@MessageBody() body: { groupId: string }) {
    if (!body?.groupId) return { ok: false, users: [] };
    const set = this.voiceUsersByGroup.get(body.groupId);
    return { ok: true, users: set ? [...set] : [] };
  }

  @SubscribeMessage('voice-offer')
  voiceOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: Record<string, unknown>,
  ) {
    const fromUserId = socket.data.userId as string;
    const target =
      (body?.targetUserId as string) || (body?.to as string) || (body?.toUserId as string);
    if (!target) return { ok: false };
    this.server.to(target).emit('voice-offer', { ...body, fromUserId });
    return { ok: true };
  }

  @SubscribeMessage('voice-answer')
  voiceAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: Record<string, unknown>,
  ) {
    const fromUserId = socket.data.userId as string;
    const target =
      (body?.targetUserId as string) || (body?.to as string) || (body?.toUserId as string);
    if (!target) return { ok: false };
    this.server.to(target).emit('voice-answer', { ...body, fromUserId });
    return { ok: true };
  }

  @SubscribeMessage('voice-ice-candidate')
  voiceIce(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: Record<string, unknown>,
  ) {
    const fromUserId = socket.data.userId as string;
    const target =
      (body?.targetUserId as string) || (body?.to as string) || (body?.toUserId as string);
    if (!target) return { ok: false };
    this.server.to(target).emit('voice-ice-candidate', { ...body, fromUserId });
    return { ok: true };
  }
}
