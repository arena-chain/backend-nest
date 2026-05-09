import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import {
  CurrencyPack,
  CurrencyPackDocument,
} from './schemas/currency-pack.schema';
import {
  CurrencyPackPurchase,
  CurrencyPackPurchaseDocument,
} from './schemas/currency-pack-purchase.schema';
import { CreateCurrencyPackDto } from './dto/create-currency-pack.dto';
import { UpdateCurrencyPackDto } from './dto/update-currency-pack.dto';
import { BlockchainService } from '../nft/blockchain.service';
import { InventoryService } from '../nft/inventory.service.js';
import { CurrencyLedgerService } from './currency-ledger.service';

@Injectable()
export class CurrencyPackService {
  constructor(
    @InjectModel(CurrencyPack.name)
    private readonly packModel: Model<CurrencyPackDocument>,
    @InjectModel(CurrencyPackPurchase.name)
    private readonly purchaseModel: Model<CurrencyPackPurchaseDocument>,
    private readonly blockchainService: BlockchainService,
    private readonly inventoryService: InventoryService,
    private readonly currencyLedgerService: CurrencyLedgerService,
    private readonly configService: ConfigService,
  ) {}

  private isPurchaseSimulationAllowed(): boolean {
    const v =
      this.configService.get<string>('GTK_ALLOW_PURCHASE_SIMULATION')?.trim() ||
      process.env.GTK_ALLOW_PURCHASE_SIMULATION?.trim();
    return v?.toLowerCase() === 'true' || v === '1';
  }

  async create(
    adminUserId: string,
    dto: CreateCurrencyPackDto,
  ): Promise<CurrencyPackDocument> {
    const doc = await this.packModel.create({
      title: dto.title.trim(),
      description: dto.description?.trim(),
      grantWholeTokens: dto.grantWholeTokens,
      priceCents: dto.priceCents,
      priceCurrency: (dto.priceCurrency || 'EUR').toUpperCase(),
      active: dto.active ?? true,
      sortOrder: dto.sortOrder ?? 0,
      createdBy: new Types.ObjectId(adminUserId),
    });
    return doc;
  }

  async update(
    packId: string,
    dto: UpdateCurrencyPackDto,
  ): Promise<CurrencyPackDocument> {
    if (!Types.ObjectId.isValid(packId)) {
      throw new BadRequestException('Invalid pack id');
    }
    const pack = await this.packModel.findById(packId).exec();
    if (!pack) {
      throw new NotFoundException('Pack not found');
    }
    if (dto.title !== undefined) pack.title = dto.title.trim();
    if (dto.description !== undefined)
      pack.description = dto.description?.trim();
    if (dto.grantWholeTokens !== undefined)
      pack.grantWholeTokens = dto.grantWholeTokens;
    if (dto.priceCents !== undefined) pack.priceCents = dto.priceCents;
    if (dto.priceCurrency !== undefined)
      pack.priceCurrency = dto.priceCurrency.toUpperCase();
    if (dto.active !== undefined) pack.active = dto.active;
    if (dto.sortOrder !== undefined) pack.sortOrder = dto.sortOrder;
    await pack.save();
    return pack;
  }

  async remove(packId: string): Promise<void> {
    if (!Types.ObjectId.isValid(packId)) {
      throw new BadRequestException('Invalid pack id');
    }
    const r = await this.packModel
      .deleteOne({ _id: new Types.ObjectId(packId) })
      .exec();
    if (r.deletedCount === 0) {
      throw new NotFoundException('Pack not found');
    }
  }

  /**
   * Store list: every pack except those explicitly marked inactive.
   * Using `$nor: [{ active: false }]` so documents without an `active` field (legacy / raw inserts)
   * still appear — `find({ active: true })` hid them and looked like an empty store.
   */
  async findActiveForStore(): Promise<CurrencyPackDocument[]> {
    return this.packModel
      .find({ $nor: [{ active: false }] })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean()
      .exec() as unknown as CurrencyPackDocument[];
  }

  async findAllForAdmin(): Promise<CurrencyPackDocument[]> {
    return this.packModel
      .find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean()
      .exec() as unknown as CurrencyPackDocument[];
  }

  async findById(packId: string): Promise<CurrencyPackDocument | null> {
    if (!Types.ObjectId.isValid(packId)) {
      return null;
    }
    return this.packModel.findById(packId).exec();
  }

  async listMyPurchases(
    userId: string,
    limit = 50,
  ): Promise<CurrencyPackPurchaseDocument[]> {
    return this.purchaseModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(100, Math.max(1, limit)))
      .lean()
      .exec() as unknown as CurrencyPackPurchaseDocument[];
  }

  /**
   * Fulfills a pack: mints grantWholeTokens to the user’s linked wallet, writes ledger + purchase row.
   * Real card payments: replace the env gate with a verified payment webhook that calls the same fulfillment.
   */
  async purchasePack(
    userId: string,
    packId: string,
  ): Promise<{
    purchaseId: string;
    transactionHash: string;
    wholeTokensGranted: number;
    packTitle: string;
    ledgerRecorded: boolean;
  }> {
    if (!this.isPurchaseSimulationAllowed()) {
      throw new BadRequestException(
        'Pack purchase is disabled — set GTK_ALLOW_PURCHASE_SIMULATION=true for local/staging mint fulfillment.',
      );
    }
    if (!this.blockchainService.isMintingEnabled()) {
      throw new BadRequestException(
        'Server minting key not configured (WALLET_PRIVATE_KEY / PRIVATE_KEY).',
      );
    }
    if (!this.blockchainService.isGameTokenConfigured()) {
      throw new BadRequestException(
        'Game token RPC not configured — set GAME_TOKEN_CONTRACT_ADDRESS and RPC_URL.',
      );
    }

    const pack = await this.findById(packId);
    if (!pack || !pack.active) {
      throw new NotFoundException('Pack not found or inactive');
    }

    const inventory = await this.inventoryService.getOrCreateInventory(userId);
    if (!inventory.walletAddress) {
      throw new BadRequestException(
        'Link a wallet on your inventory before purchasing a pack.',
      );
    }

    const meta = await this.blockchainService.resolveGameTokenMetadataForApi();
    if (!meta) {
      throw new BadRequestException('Game token metadata unavailable');
    }

    const wei = ethers.utils.parseUnits(
      String(pack.grantWholeTokens),
      meta.decimals,
    );
    let transactionHash: string;
    try {
      const r = await this.blockchainService.mintGameToken(
        inventory.walletAddress,
        wei,
      );
      transactionHash = r.transactionHash;
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Mint failed');
    }

    const amountFormatted = ethers.utils.formatUnits(wei, meta.decimals);
    let ledgerRecorded = false;
    try {
      await this.currencyLedgerService.append({
        userId,
        walletAddress: inventory.walletAddress,
        direction: 'in',
        category: 'pack_purchase',
        amountWei: wei.toString(),
        amountFormatted,
        decimals: meta.decimals,
        chainId: meta.chainId,
        txHash: transactionHash,
        title: `Pack: ${pack.title}`,
        meta: {
          packId: pack._id.toString(),
          packTitle: pack.title,
          priceCents: pack.priceCents,
          priceCurrency: pack.priceCurrency,
        },
      });
      ledgerRecorded = true;
    } catch {
      ledgerRecorded = false;
    }

    const purchase = await this.purchaseModel.create({
      userId: new Types.ObjectId(userId),
      packId: pack._id,
      packTitleSnapshot: pack.title,
      wholeTokensGranted: pack.grantWholeTokens,
      priceCentsSnapshot: pack.priceCents,
      priceCurrencySnapshot: pack.priceCurrency,
      fulfillmentTxHash: transactionHash,
      status: 'completed',
    });

    return {
      purchaseId: purchase._id.toString(),
      transactionHash,
      wholeTokensGranted: pack.grantWholeTokens,
      packTitle: pack.title,
      ledgerRecorded,
    };
  }
}
