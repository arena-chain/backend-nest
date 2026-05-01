import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DuelService } from './duel.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'duel',
})
export class DuelGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('DuelGateway');

  constructor(private readonly duelService: DuelService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('duel:create')
  async onCreate(
    @MessageBody() data: { userId: string; username: string; config: any; isPublic: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = await this.duelService.createLobby(data.userId, data.username, data.config, data.isPublic);
      client.join(`duel-${session.lobbyCode}`);
      client.emit('duel:lobby_created', session);
      
      if (data.isPublic) {
        await this.broadcastPublicLobbies();
      }
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  @SubscribeMessage('duel:join')
  async onJoin(
    @MessageBody() data: { lobbyCode: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = await this.duelService.joinLobby(data.lobbyCode, data.userId, data.username);
      client.join(`duel-${session.lobbyCode}`);
      this.server.to(`duel-${session.lobbyCode}`).emit('duel:player_joined', session);

      // If it was a public lobby, update everyone's list (it's now full/gone)
      if (session.isPublic) {
        await this.broadcastPublicLobbies();
      }
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  @SubscribeMessage('duel:list_public')
  async onListPublic(@ConnectedSocket() client: Socket) {
    try {
      const lobbies = await this.duelService.findPublicLobbies();
      client.emit('duel:public_lobbies', lobbies);
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  @SubscribeMessage('duel:ready')
  async onReady(
    @MessageBody() data: { lobbyCode: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = await this.duelService.playerReady(data.lobbyCode, data.userId);
      this.server.to(`duel-${data.lobbyCode}`).emit('duel:player_ready', { userId: data.userId, status: session.status });
      
      if (session.status === 'in_progress') {
        const startTimestamp = Date.now() + 3000; // 3 second countdown
        this.server.to(`duel-${data.lobbyCode}`).emit('duel:start', { config: session.config, startTimestamp });
      }
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  @SubscribeMessage('duel:score_update')
  async onScoreUpdate(
    @MessageBody() data: { lobbyCode: string; userId: string; score: number; accuracy: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.duelService.updateScore(data.lobbyCode, data.userId, data.score, data.accuracy);
      client.to(`duel-${data.lobbyCode}`).emit('duel:opponent_score', { 
        userId: data.userId, 
        score: data.score, 
        accuracy: data.accuracy 
      });
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  @SubscribeMessage('duel:finish')
  async onFinish(
    @MessageBody() data: { lobbyCode: string; userId: string; finalStats: any },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = await this.duelService.finishSession(data.lobbyCode, data.userId, data.finalStats);
      if (session && session.status === 'finished') {
        // Redundant signaling: Broadcast to room AND emit directly to the finishing player
        this.server.to(`duel-${data.lobbyCode}`).emit('duel:result', session);
        client.emit('duel:result', session);
      }
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  @SubscribeMessage('duel:leave')
  async onLeave(
    @MessageBody() data: { lobbyCode: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.duelService.leaveLobby(data.lobbyCode, data.userId);
      client.leave(`duel-${data.lobbyCode}`);
      this.server.to(`duel-${data.lobbyCode}`).emit('duel:opponent_left', { userId: data.userId });
      
      // Update public list
      await this.broadcastPublicLobbies();
    } catch (err) {
      client.emit('duel:error', { message: err.message });
    }
  }

  private async broadcastPublicLobbies() {
    const lobbies = await this.duelService.findPublicLobbies();
    this.server.emit('duel:public_lobbies', lobbies);
  }
}
