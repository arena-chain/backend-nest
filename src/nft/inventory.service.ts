import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ethers } from 'ethers';
import { Inventory, InventoryDocument } from './schemas/inventory.entity';
import { NftItem, NftItemDocument } from './schemas/nft-item.entity';
import { EquipItemDto } from './dto/equip-item.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    @InjectModel(NftItem.name) private nftItemModel: Model<NftItemDocument>,
  ) {}

  async getOrCreateInventory(userId: string): Promise<InventoryDocument> {
    let inventory = await this.inventoryModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items',
        populate: {
          path: 'nftId',
          populate: { path: 'compatibleGames', select: 'title genre' },
        },
      })
      .populate({
        path: 'equippedItems.nftItemId',
        populate: {
          path: 'nftId',
          populate: { path: 'compatibleGames', select: 'title genre' },
        },
      })
      .exec();

    if (!inventory) {
      inventory = await this.inventoryModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        equippedItems: [],
      });
    }

    return inventory;
  }

  async addItemToInventory(
    userId: string,
    nftItemId: string,
  ): Promise<InventoryDocument> {
    const item = await this.nftItemModel.findById(nftItemId);
    if (!item) throw new NotFoundException('NFT Item not found');
    if (item.ownerId.toString() !== userId) {
      throw new BadRequestException('This item does not belong to you');
    }

    let inventory = await this.inventoryModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!inventory) {
      inventory = await this.inventoryModel.create({
        userId: new Types.ObjectId(userId),
        items: [new Types.ObjectId(nftItemId)],
        equippedItems: [],
      });
    } else {
      const alreadyInInventory = inventory.items.some(
        (id) => id.toString() === nftItemId,
      );
      if (!alreadyInInventory) {
        inventory.items.push(new Types.ObjectId(nftItemId));
        await inventory.save();
      }
    }

    return this.getOrCreateInventory(userId);
  }

  async removeItemFromInventory(
    userId: string,
    nftItemId: string,
  ): Promise<InventoryDocument> {
    const inventory = await this.inventoryModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!inventory) throw new NotFoundException('Inventory not found');

    const equipped = inventory.equippedItems.find(
      (e) => e.nftItemId.toString() === nftItemId,
    );
    if (equipped) {
      throw new BadRequestException(
        'Unequip the item before removing it from inventory',
      );
    }

    inventory.items = inventory.items.filter(
      (id) => id.toString() !== nftItemId,
    );
    await inventory.save();

    return this.getOrCreateInventory(userId);
  }

  async equipItem(
    userId: string,
    dto: EquipItemDto,
  ): Promise<InventoryDocument> {
    const inventory = await this.inventoryModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!inventory) throw new NotFoundException('Inventory not found');

    const hasItem = inventory.items.some(
      (id) => id.toString() === dto.nftItemId,
    );
    if (!hasItem)
      throw new BadRequestException('Item is not in your inventory');

    const item = await this.nftItemModel
      .findById(dto.nftItemId)
      .populate('nftId');
    if (!item) throw new NotFoundException('NFT Item not found');
    if (item.status === 'LISTED') {
      throw new BadRequestException('Unlist the item before equipping');
    }

    const nft = item.nftId as any;
    if (!nft.isEquippable) {
      throw new BadRequestException('This NFT is not equippable');
    }

    const existingInSlot = inventory.equippedItems.findIndex(
      (e) => e.slot === dto.slot,
    );
    if (existingInSlot >= 0) {
      const oldItemId = inventory.equippedItems[existingInSlot].nftItemId;
      await this.nftItemModel.findByIdAndUpdate(oldItemId, { status: 'OWNED' });
      inventory.equippedItems.splice(existingInSlot, 1);
    }

    inventory.equippedItems.push({
      nftItemId: new Types.ObjectId(dto.nftItemId),
      slot: dto.slot,
      equippedAt: new Date(),
    });

    item.status = 'EQUIPPED';
    await item.save();
    await inventory.save();

    return this.getOrCreateInventory(userId);
  }

  async unequipItem(
    userId: string,
    nftItemId: string,
  ): Promise<InventoryDocument> {
    const inventory = await this.inventoryModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!inventory) throw new NotFoundException('Inventory not found');

    const idx = inventory.equippedItems.findIndex(
      (e) => e.nftItemId.toString() === nftItemId,
    );
    if (idx < 0) throw new BadRequestException('Item is not equipped');

    inventory.equippedItems.splice(idx, 1);
    await inventory.save();

    await this.nftItemModel.findByIdAndUpdate(nftItemId, { status: 'OWNED' });

    return this.getOrCreateInventory(userId);
  }

  /**
   * Creates an in-app EVM address for GTK/VEX (custodial-style: server knows the address for mints).
   * Optional `metadata.custodialPrivateKey` when GTK_CUSTODIAL_INSECURE_STORE=true (local dev only — never in production).
   */
  async ensureAppWallet(userId: string): Promise<InventoryDocument> {
    const inv = await this.inventoryModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    const w = ethers.Wallet.createRandom();
    const addr = ethers.utils.getAddress(w.address);
    const insecure =
      process.env.GTK_CUSTODIAL_INSECURE_STORE?.trim().toLowerCase() === 'true';
    const meta: Record<string, unknown> = {
      ...(inv?.metadata && typeof inv.metadata === 'object'
        ? inv.metadata
        : {}),
      appWalletProvisioned: true,
    };
    if (insecure) {
      meta.custodialPrivateKey = w.privateKey;
    }
    if (!inv) {
      return this.inventoryModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        equippedItems: [],
        walletAddress: addr,
        metadata: meta,
      });
    }
    if (inv.walletAddress) {
      return inv;
    }
    inv.walletAddress = addr;
    inv.metadata = meta as typeof inv.metadata;
    await inv.save();
    return inv;
  }

  /**
   * Sets inventory.walletAddress to a user-controlled EOA (e.g. MetaMask).
   * Replaces any prior in-app provisioned address; strips custodial key material from metadata when present.
   */
  async linkExternalWallet(
    userId: string,
    requestedAddress: string,
  ): Promise<InventoryDocument> {
    let checksum: string;
    try {
      checksum = ethers.utils.getAddress(requestedAddress.trim());
    } catch {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const inv = await this.inventoryModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    const baseMeta =
      inv?.metadata && typeof inv.metadata === 'object' && inv.metadata !== null
        ? { ...(inv.metadata as Record<string, unknown>) }
        : ({} as Record<string, unknown>);
    delete baseMeta.custodialPrivateKey;
    delete baseMeta.appWalletProvisioned;
    baseMeta.externalWallet = true;
    baseMeta.externalWalletLinkedAt = new Date().toISOString();

    if (!inv) {
      return this.inventoryModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        equippedItems: [],
        walletAddress: checksum,
        metadata: baseMeta,
      });
    }

    inv.walletAddress = checksum;
    inv.metadata = baseMeta as typeof inv.metadata;
    await inv.save();
    return inv;
  }

  async getEquippedItems(userId: string): Promise<any[]> {
    const inventory = await this.inventoryModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'equippedItems.nftItemId',
        populate: {
          path: 'nftId',
          populate: { path: 'compatibleGames', select: 'title genre' },
        },
      })
      .exec();

    if (!inventory) return [];
    return inventory.equippedItems;
  }
}
