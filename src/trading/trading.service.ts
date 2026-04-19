import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TradingOrder, OrderSide, OrderType, OrderStatus } from './schemas/order.schema';
import { TradingTrade } from './schemas/trade.schema';
import { TradingAsset } from './schemas/asset.schema';
import { User } from '../user/schemas/user.schema';
import { TradingGateway } from './trading.gateway';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class TradingService {
    constructor(
        @InjectModel(TradingOrder.name) private orderModel: Model<TradingOrder>,
        @InjectModel(TradingTrade.name) private tradeModel: Model<TradingTrade>,
        @InjectModel(TradingAsset.name) private assetModel: Model<TradingAsset>,
        @InjectModel(User.name) private userModel: Model<User>,
        @Inject(forwardRef(() => TradingGateway)) private tradingGateway: TradingGateway,
    ) { }

    async placeOrder(userId: string, assetId: string, side: OrderSide, type: OrderType, price: number, amount: number) {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const asset = await this.assetModel.findById(assetId);
        if (!asset) throw new NotFoundException('Asset not found');

        // Basic validation
        if (side === 'BUY') {
            const totalCost = price * amount;
            if (user.walletBalance < totalCost) {
                throw new BadRequestException('Insufficient balance');
            }
            // Reserve balance (locking)
            user.walletBalance -= totalCost;
            await user.save();
        }

        const order = new this.orderModel({
            userId: new Types.ObjectId(userId),
            assetId: new Types.ObjectId(assetId),
            side,
            orderType: type,
            price,
            amount,
            status: 'OPEN',
        });

        await order.save();

        // Broadcast order book update
        await this.tradingGateway.broadcastOrderBook(assetId);

        // Trigger matching engine
        await this.matchOrder(order);

        return order;
    }

    private async matchOrder(order: TradingOrder) {
        const opposingSide = order.side === 'BUY' ? 'SELL' : 'BUY';

        // Find matching orders
        // For BUY: Find SELL orders with price <= target price
        // For SELL: Find BUY orders with price >= target price
        const sortOrder = order.side === 'BUY' ? 1 : -1;
        const priceFilter = order.side === 'BUY' ? { $lte: order.price } : { $gte: order.price };

        const matchingOrders = await this.orderModel.find({
            assetId: order.assetId,
            side: opposingSide,
            status: { $in: ['OPEN', 'PARTIALLY_FILLED'] },
            price: priceFilter,
            userId: { $ne: order.userId }, // Don't match own orders
        }).sort({ price: sortOrder, createdAt: 1 });

        for (const takerOrder of matchingOrders) {
            if (order.status === 'FILLED') break;

            const remainingAmount = order.amount - order.filledAmount;
            const takerRemaining = takerOrder.amount - takerOrder.filledAmount;
            const matchAmount = Math.min(remainingAmount, takerRemaining);

            const matchPrice = takerOrder.price; // Taker price (price already in book)

            // Execute trade
            await this.executeTrade(order, takerOrder, matchAmount, matchPrice);
        }
    }

    private async executeTrade(maker: TradingOrder, taker: TradingOrder, amount: number, price: number) {
        const trade = new this.tradeModel({
            assetId: maker.assetId,
            buyOrderId: maker.side === 'BUY' ? maker._id : taker._id,
            sellOrderId: maker.side === 'SELL' ? maker._id : taker._id,
            buyerId: maker.side === 'BUY' ? maker.userId : taker.userId,
            sellerId: maker.side === 'SELL' ? maker.userId : taker.userId,
            price,
            amount,
        });

        await trade.save();

        // Update orders
        maker.filledAmount += amount;
        maker.status = maker.filledAmount === maker.amount ? 'FILLED' : 'PARTIALLY_FILLED';
        await maker.save();

        taker.filledAmount += amount;
        taker.status = taker.filledAmount === taker.amount ? 'FILLED' : 'PARTIALLY_FILLED';
        await taker.save();

        // Update users (Sellers get paid, Buyers already locked funds)
        const sellerId = maker.side === 'SELL' ? maker.userId : taker.userId;
        const seller = await this.userModel.findById(sellerId);
        if (seller) {
            seller.walletBalance += amount * price;
            await seller.save();
        }

        // Update asset last price
        await this.assetModel.findByIdAndUpdate(maker.assetId, { lastPrice: price });

        // Broadcast updates
        this.tradingGateway.broadcastTrade(maker.assetId.toString(), trade);
        await this.tradingGateway.broadcastOrderBook(maker.assetId.toString());
    }

    async getOrderBook(assetId: string) {
        const bids = await this.orderModel.aggregate([
            { $match: { assetId: new Types.ObjectId(assetId), side: 'BUY', status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } } },
            { $group: { _id: '$price', totalAmount: { $sum: { $subtract: ['$amount', '$filledAmount'] } } } },
            { $sort: { _id: -1 } }
        ]);

        const asks = await this.orderModel.aggregate([
            { $match: { assetId: new Types.ObjectId(assetId), side: 'SELL', status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } } },
            { $group: { _id: '$price', totalAmount: { $sum: { $subtract: ['$amount', '$filledAmount'] } } } },
            { $sort: { _id: 1 } }
        ]);

        return { bids, asks };
    }

    async getTradeHistory(assetId: string) {
        return this.tradeModel.find({ assetId }).sort({ createdAt: -1 }).limit(50).exec();
    }

    async getAllAssets() {
        return this.assetModel.find({ isActive: true }).exec();
    }

    async getAssetDetails(assetId: string) {
        const asset = await this.assetModel.findById(assetId).exec();
        if (!asset) throw new NotFoundException('Asset not found');

        const orderBook = await this.getOrderBook(assetId);
        const history = await this.getTradeHistory(assetId);

        return { asset, orderBook, history };
    }

    async getUserPortfolio(userId: string) {
        // Find all filled buy orders for this user
        const trades = await this.tradeModel.find({ buyerId: new Types.ObjectId(userId) }).populate('assetId').exec();

        // Group by asset and calculate average price and total amount
        const portfolioMap = new Map<string, any>();

        for (const trade of trades) {
            const assetId = (trade.assetId as any)._id.toString();
            const asset = trade.assetId as any;

            if (!portfolioMap.has(assetId)) {
                portfolioMap.set(assetId, {
                    asset,
                    totalAmount: 0,
                    totalPaid: 0,
                });
            }

            const pos = portfolioMap.get(assetId);
            pos.totalAmount += trade.amount;
            pos.totalPaid += trade.amount * trade.price;
        }

        const assets = Array.from(portfolioMap.values()).map(pos => {
            const avgPrice = pos.totalPaid / pos.totalAmount;
            const currentPrice = pos.asset.lastPrice || avgPrice;
            const currentValue = pos.totalAmount * currentPrice;
            const pnl = currentValue - pos.totalPaid;
            const pnlPercentage = (pnl / pos.totalPaid) * 100;

            return {
                asset: pos.asset,
                amount: pos.totalAmount,
                averagePrice: avgPrice,
                currentPrice,
                currentValue,
                pnl,
                pnlPercentage,
            };
        });

        // Get active orders
        const activeOrders = await this.orderModel.find({
            userId: new Types.ObjectId(userId),
            status: { $in: ['OPEN', 'PARTIALLY_FILLED'] }
        }).populate('assetId').exec();

        return { assets, activeOrders };
    }
}
