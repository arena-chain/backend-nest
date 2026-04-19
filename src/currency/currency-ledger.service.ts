import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    GameTokenLedgerDirection,
    GameTokenLedgerDocument,
    GameTokenLedgerEntry,
} from './schemas/game-token-ledger.schema';

export type LedgerListItem = {
    id: string;
    direction: GameTokenLedgerDirection;
    category: string;
    title: string;
    amountWei: string;
    amountFormatted: string;
    decimals: number;
    chainId?: number;
    txHash?: string;
    meta?: Record<string, unknown>;
    createdAt: string;
};

@Injectable()
export class CurrencyLedgerService {
    private readonly logger = new Logger(CurrencyLedgerService.name);

    constructor(
        @InjectModel(GameTokenLedgerEntry.name)
        private readonly ledgerModel: Model<GameTokenLedgerDocument>,
    ) {}

    async append(params: {
        userId: string;
        walletAddress: string | null;
        direction: GameTokenLedgerDirection;
        category: string;
        amountWei: string;
        amountFormatted: string;
        decimals: number;
        chainId?: number;
        txHash?: string;
        title: string;
        meta?: Record<string, unknown>;
    }): Promise<GameTokenLedgerDocument> {
        try {
            return await this.ledgerModel.create({
                userId: new Types.ObjectId(params.userId),
                walletAddress: params.walletAddress ?? undefined,
                direction: params.direction,
                category: params.category,
                amountWei: params.amountWei,
                amountFormatted: params.amountFormatted,
                decimals: params.decimals,
                chainId: params.chainId,
                txHash: params.txHash?.toLowerCase(),
                title: params.title,
                meta: params.meta,
            });
        } catch (e: any) {
            if (e?.code === 11000) {
                throw new BadRequestException('This on-chain transaction is already recorded in your history.');
            }
            this.logger.error(`Ledger write failed: ${e?.message || e}`);
            throw e;
        }
    }

    async findByUserId(
        userId: string,
        page: number,
        limit: number,
    ): Promise<{ items: LedgerListItem[]; total: number }> {
        const q = { userId: new Types.ObjectId(userId) };
        const [total, rows] = await Promise.all([
            this.ledgerModel.countDocuments(q).exec(),
            this.ledgerModel
                .find(q)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
        ]);
        const items: LedgerListItem[] = rows.map((r) => ({
            id: String(r._id),
            direction: r.direction,
            category: r.category,
            title: r.title,
            amountWei: r.amountWei,
            amountFormatted: r.amountFormatted,
            decimals: r.decimals,
            chainId: r.chainId,
            txHash: r.txHash,
            meta: r.meta,
            createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
        }));
        return { items, total };
    }
}
