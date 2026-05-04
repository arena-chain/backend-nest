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
import { UsersService } from '../user/user.service';
import { PresenceService, UserStatus } from './presence.service';

@WebSocketGateway({
  namespace: '/presence',
  cors: { origin: true, credentials: true },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly presenceService: PresenceService,
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
        `presence auth failed: ${socket.id} (token len: ${token.length}) - ${error.message}`,
      );
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
    this.presenceService.addUser(userId, socket.id);

    const friendSockets = await this.presenceService.getFriendSocketIds(userId);
    for (const sid of friendSockets) {
      this.server.to(sid).emit('friend-online', {
        userId,
        status: UserStatus.ONLINE,
      });
    }

    const friends = await this.presenceService.getFriendsPresence(userId);
    const sorted = friends.sort((a, b) => {
      const order = {
        [UserStatus.IN_GAME]: 0,
        [UserStatus.IN_QUEUE]: 1,
        [UserStatus.ONLINE]: 2,
        [UserStatus.AWAY]: 3,
        [UserStatus.OFFLINE]: 4,
      };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });
    socket.emit('presence-ready', { friends: sorted });

    this.logger.log(`presence connected: ${userId} (${socket.id})`);
  }

  async handleDisconnect(socket: Socket) {
    const userId = this.presenceService.removeBySocket(socket.id);
    if (!userId) return;

    const friendSockets = await this.presenceService.getFriendSocketIds(userId);
    for (const sid of friendSockets) {
      this.server.to(sid).emit('friend-offline', { userId });
    }

    this.logger.log(`presence disconnected: ${userId}`);
  }

  @SubscribeMessage('update-status')
  async handleUpdateStatus(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: { status: UserStatus; game?: string; details?: string },
  ) {
    const userId = socket.data.userId as string;
    if (!userId) return { ok: false };

    const entry = this.presenceService.updateStatus(
      userId,
      body.status,
      body.game,
      body.details,
    );
    if (!entry) return { ok: false };

    const friendSockets = await this.presenceService.getFriendSocketIds(userId);
    for (const sid of friendSockets) {
      this.server.to(sid).emit('friend-status', {
        userId,
        status: entry.status,
        game: entry.game,
        details: entry.details,
      });
    }

    return { ok: true };
  }

  @SubscribeMessage('get-friends')
  async handleGetFriends(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string;
    if (!userId) return { ok: false, friends: [] };

    const friends = await this.presenceService.getFriendsPresence(userId);

    const sorted = friends.sort((a, b) => {
      const order = {
        [UserStatus.IN_GAME]: 0,
        [UserStatus.IN_QUEUE]: 1,
        [UserStatus.ONLINE]: 2,
        [UserStatus.AWAY]: 3,
        [UserStatus.OFFLINE]: 4,
      };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

    return { ok: true, friends: sorted };
  }
}
