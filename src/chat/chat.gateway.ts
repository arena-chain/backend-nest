import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UsersService } from '../user/user.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) {}

  private async authenticate(socket: Socket): Promise<string | null> {
    let token = socket.handshake.auth?.token;
    if (!token) return null;

    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.usersService.findById(payload.sub);
      return user?._id?.toString() || null;
    } catch (error) {
      this.logger.warn(
        `chat auth failed: ${socket.id} (token len: ${token.length}) - ${error.message}`,
      );
      return null;
    }
  }

  async handleConnection(socket: Socket) {
    const userId = await this.authenticate(socket);
    if (!userId) {
      this.logger.log(`chat connection rejected (unauthorized): ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    socket.data.userId = userId;
    socket.join(userId); // Join private room for PMs
    this.logger.log(`chat connected: ${userId} (${socket.id})`);
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room.startsWith('voice:')) {
        socket.to(room).emit('user-left', { userId });
      }
    });
    this.logger.log(`chat disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    socket.join(data.roomId);
    this.logger.log(`socket ${socket.id} joined room ${data.roomId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    socket.leave(data.roomId);
    this.logger.log(`socket ${socket.id} left room ${data.roomId}`);
    return { ok: true };
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; message: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return { ok: false, error: 'Unauthorized' };

    const created = await this.chatService.createForUser(userId, {
      channelId: data.roomId,
      message: data.message,
    });

    this.server.to(data.roomId).emit('new-message', created);
    return { ok: true, data: created };
  }

  @SubscribeMessage('sendPrivateMessage')
  async handlePrivateMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { receiverId: string; message: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return { ok: false, error: 'Unauthorized' };

    const created = await this.chatService.createPrivateMessage(
      userId,
      data.receiverId,
      data.message,
    );

    // Emit to the receiver's private room
    this.server.to(data.receiverId).emit('newPrivateMessage', created);

    return created;
  }

  @SubscribeMessage('sendGroupMessage')
  async handleGroupMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string; message: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return { status: 'error', message: 'Unauthorized' };

    const created = await this.chatService.createForUser(userId, {
      channelId: data.groupId,
      message: data.message,
    });

    this.server.to(data.groupId).emit('newGroupMessage', {
      ...created,
      groupId: data.groupId, // Frontend expects groupId in the message
    });
    return { status: 'ok', data: created };
  }

  @SubscribeMessage('joinGroupRoom')
  handleJoinGroupRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    socket.join(data.groupId);
    this.logger.log(`socket ${socket.id} joined group room ${data.groupId}`);
    return { status: 'ok' };
  }


  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; receiverId: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return { status: 'error' };

    const success = await this.chatService.deleteMessage(data.messageId, userId);
    if (success) {
      this.server.to(data.receiverId).to(userId).emit('messageDeleted', {
        messageId: data.messageId,
      });
      return { status: 'ok' };
    }
    return { status: 'error' };
  }

  @SubscribeMessage('deleteConversation')
  async handleDeleteConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { interlocutorId: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return { status: 'error' };

    await this.chatService.deleteConversation(userId, data.interlocutorId);
    return { status: 'ok' };
  }

  // 🎙️ VOICE CHAT SIGNALING
  @SubscribeMessage('joinVoiceRoom')
  async handleJoinVoiceRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = socket.data.userId;
    const roomName = `voice:${data.roomId}`;
    socket.join(roomName);

    socket.to(roomName).emit('user-joined', { userId });

    const sockets = await this.server.in(roomName).fetchSockets();
    const participants = sockets
      .map((s) => s.data.userId)
      .filter((id) => id && id !== userId);

    return { status: 'ok', participants };
  }

  @SubscribeMessage('leaveVoiceRoom')
  handleLeaveVoiceRoom(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId;
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room.startsWith('voice:')) {
        socket.leave(room);
        socket.to(room).emit('user-left', { userId });
      }
    });
    return { status: 'ok' };
  }

  @SubscribeMessage('getVoiceRoomUsers')
  async handleGetVoiceRoomUsers(@MessageBody() data: { roomId: string }) {
    const roomName = `voice:${data.roomId}`;
    const sockets = await this.server.in(roomName).fetchSockets();
    const participants = sockets
      .map((s) => s.data.userId)
      .filter((id) => !!id);

    return participants;
  }



  @SubscribeMessage('voice-offer')
  handleVoiceOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; offer: any },
  ) {
    this.server.to(data.to).emit('voice-offer', {
      from: socket.data.userId,
      offer: data.offer,
    });
  }

  @SubscribeMessage('voice-answer')
  handleVoiceAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; answer: any },
  ) {
    this.server.to(data.to).emit('voice-answer', {
      from: socket.data.userId,
      answer: data.answer,
    });
  }

  @SubscribeMessage('voice-ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; candidate: any },
  ) {
    this.server.to(data.to).emit('voice-ice-candidate', {
      from: socket.data.userId,
      candidate: data.candidate,
    });
  }

}
