import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TradingService } from './trading.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'trading',
})
export class TradingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(
        @Inject(forwardRef(() => TradingService))
        private tradingService: TradingService
    ) { }

    handleConnection(client: Socket) {
        console.log(`Client connected to trading: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected from trading: ${client.id}`);
    }

    @SubscribeMessage('subscribeAsset')
    async handleSubscribeAsset(client: Socket, assetId: string) {
        client.join(`asset_${assetId}`);

        // Send initial data
        const orderBook = await this.tradingService.getOrderBook(assetId);
        const history = await this.tradingService.getTradeHistory(assetId);

        client.emit('orderBookUpdate', orderBook);
        client.emit('tradeHistoryUpdate', history);
    }

    broadcastTrade(assetId: string, trade: any) {
        this.server.to(`asset_${assetId}`).emit('newTrade', trade);
    }

    async broadcastOrderBook(assetId: string) {
        const orderBook = await this.tradingService.getOrderBook(assetId);
        this.server.to(`asset_${assetId}`).emit('orderBookUpdate', orderBook);
    }
}
