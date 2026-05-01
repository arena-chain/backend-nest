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
import { MatchmakingService } from './matchmaking.service';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    namespace: '/matchmaking',
    cors: { origin: true, credentials: true },
})
export class MatchmakingGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MatchmakingGateway.name);

    private readonly userSockets = new Map<string, string>();
    private readonly socketUsers = new Map<string, string>();

    constructor(
        private readonly jwtService: JwtService,
        @Inject(forwardRef(() => MatchmakingService))
        private readonly matchmakingService: MatchmakingService,
    ) {}

    private async authenticate(socket: Socket): Promise<string | null> {
        const token = socket.handshake.auth?.token;
        if (!token) return null;

        try {
            const payload = await this.jwtService.verifyAsync(token);
            return payload.sub ?? null;
        } catch {
            this.logger.warn(`matchmaking auth failed: ${socket.id}`);
            return null;
        }
    }

    async handleConnection(socket: Socket) {
        const userId = await this.authenticate(socket);
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        const prev = this.userSockets.get(userId);
        if (prev) {
            this.socketUsers.delete(prev);
        }

        socket.data.userId = userId;
        this.userSockets.set(userId, socket.id);
        this.socketUsers.set(socket.id, userId);

        socket.emit('mm:connected', { userId });
        this.logger.log(`mm connected: ${userId} (${socket.id})`);
    }

    async handleDisconnect(socket: Socket) {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) return;

        this.socketUsers.delete(socket.id);
        if (this.userSockets.get(userId) === socket.id) {
            this.userSockets.delete(userId);
        }

        this.logger.log(`mm disconnected: ${userId}`);
    }

    @SubscribeMessage('mm:join-game-room')
    handleJoinGameRoom(
        @ConnectedSocket() socket: Socket,
        @MessageBody() body: { gameId: string },
    ) {
        if (body?.gameId) {
            socket.join(`game:${body.gameId}`);
        }
        return { ok: true };
    }

    @SubscribeMessage('mm:report-lobby-id')
    async handleReportLobbyId(
        @ConnectedSocket() socket: Socket,
        @MessageBody() body: { gameId: string; lobbyId: string; hostSteamId?: string },
    ) {
        this.logger.log(`[LobbyReport] Game: ${body.gameId}, Lobby: ${body.lobbyId}, Host: ${body.hostSteamId}`);
        if (!body.gameId || !body.lobbyId) return { ok: false };
        await this.matchmakingService.updateLobbyId(body.gameId, body.lobbyId, body.hostSteamId);
        return { ok: true };
    }

    // ──────────────────────────────────────────────────────────
    // SERVER → CLIENT push helpers (called by MatchmakingService)
    // ──────────────────────────────────────────────────────────

    emitToUser(userId: string, event: string, payload: any) {
        const sid = this.userSockets.get(userId);
        if (sid) {
            this.server.to(sid).emit(event, payload);
        }
    }

    emitToGame(gameId: string, event: string, payload: any) {
        this.server.to(`game:${gameId}`).emit(event, payload);
    }

    async emitMatchFound(participantUserIds: string[], game: any) {
        const gameRoom = `game:${game._id.toString()}`;

        const allSockets = await this.server.fetchSockets();

        for (const uid of participantUserIds) {
            const sid = this.userSockets.get(uid);
            if (sid) {
                const remote = allSockets.find((s) => s.id === sid);
                if (remote) {
                    remote.join(gameRoom);
                }
            }
        }

        this.server.to(gameRoom).emit('mm:match-found', { game });
    }

    emitPlayerResponse(gameId: string, userId: string, accepted: boolean, game: any) {
        this.server.to(`game:${gameId}`).emit('mm:player-response', {
            userId,
            accepted,
            game,
        });
    }

    emitGameRoomReady(gameId: string, game: any) {
        this.server.to(`game:${gameId}`).emit('mm:game-room-ready', { game });
    }

    emitMatchCancelled(gameId: string, reason: string) {
        this.server.to(`game:${gameId}`).emit('mm:match-cancelled', {
            gameId,
            reason,
        });
    }

    emitMatchCompleted(gameId: string, payload: any) {
        this.server.to(`game:${gameId}`).emit('mm:match-completed', payload);
    }

    emitLobbyIdUpdated(gameId: string, lobbyId: string, hostSteamId?: string) {
        this.logger.log(`[LobbyEmit] Broadcasting update for ${gameId}: Lobby=${lobbyId}, Host=${hostSteamId}`);
        this.server.to(`game:${gameId}`).emit('mm:lobby-id-updated', {
            gameId,
            lobbyId,
            hostSteamId,
        });
    }
}
