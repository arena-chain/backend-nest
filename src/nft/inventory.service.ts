import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory, InventoryDocument } from './schemas/inventory.entity';
import { NftItem, NftItemDocument } from './schemas/nft-item.entity';
import { EquipItemDto } from './dto/equip-item.dto';

@Injectable()
export class InventoryService {
    constructor(
        @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
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

    async addItemToInventory(userId: string, nftItemId: string): Promise<InventoryDocument> {
        const item = await this.nftItemModel.findById(nftItemId);
        if (!item) throw new NotFoundException('NFT Item not found');
        if (item.ownerId.toString() !== userId) {
            throw new BadRequestException('This item does not belong to you');
        }

        let inventory = await this.inventoryModel.findOne({ userId: new Types.ObjectId(userId) });
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

    async removeItemFromInventory(userId: string, nftItemId: string): Promise<InventoryDocument> {
        const inventory = await this.inventoryModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!inventory) throw new NotFoundException('Inventory not found');

        const equipped = inventory.equippedItems.find(
            (e) => e.nftItemId.toString() === nftItemId,
        );
        if (equipped) {
            throw new BadRequestException('Unequip the item before removing it from inventory');
        }

        inventory.items = inventory.items.filter(
            (id) => id.toString() !== nftItemId,
        ) as Types.ObjectId[];
        await inventory.save();

        return this.getOrCreateInventory(userId);
    }

    async equipItem(userId: string, dto: EquipItemDto): Promise<InventoryDocument> {
        const inventory = await this.inventoryModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!inventory) throw new NotFoundException('Inventory not found');

        const hasItem = inventory.items.some(
            (id) => id.toString() === dto.nftItemId,
        );
        if (!hasItem) throw new BadRequestException('Item is not in your inventory');

        const item = await this.nftItemModel.findById(dto.nftItemId).populate('nftId');
        if (!item) throw new NotFoundException('NFT Item not found');

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

    async unequipItem(userId: string, nftItemId: string): Promise<InventoryDocument> {
        const inventory = await this.inventoryModel.findOne({ userId: new Types.ObjectId(userId) });
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

    async setWalletAddress(userId: string, walletAddress: string): Promise<InventoryDocument> {
        const inventory = await this.inventoryModel.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { walletAddress },
            { new: true, upsert: true },
        );
        return inventory;
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
