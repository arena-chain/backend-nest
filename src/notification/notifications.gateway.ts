import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    namespace: '/notifications',
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly jwtService: JwtService) { }

    async handleConnection(client: Socket) {
        try {
            const token =
                (client.handshake.auth?.token as string) ||
                (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

            if (!token) {
                client.disconnect();
                return;
            }

            const decoded = this.jwtService.verify(token) as { sub?: string; userId?: string };
            const userId = decoded.sub ?? decoded.userId;
            if (!userId) {
                client.disconnect();
                return;
            }

            // Join personal room
            await client.join(`notifications:${userId}`);
            client.data.userId = userId;
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // nothing to clean up
    }

    /** Push a new notification to the owner's browser/desktop in real-time */
    emitToUser(userId: string, notification: unknown) {
        this.server.to(`notifications:${userId}`).emit('notification:new', notification);
    }

    /** Client can request an unread count refresh */
    @SubscribeMessage('refresh')
    handleRefresh(@ConnectedSocket() client: Socket, @MessageBody() _data: unknown) {
        client.emit('refresh:ack', { userId: client.data.userId });
    }
}
