import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Nft, NftDocument } from './schemas/nft.entity';
import { NftAttribute, NftAttributeDocument } from './schemas/nft-attribute.entity';
import { NftItem, NftItemDocument } from './schemas/nft-item.entity';
import { NftCollection, NftCollectionDocument } from './schemas/nft-collection.entity';
import { NftTransaction, NftTransactionDocument } from './schemas/nft-transaction.entity';
import { CreateNftDto } from './dto/create-nft.dto';
import { UpdateNftDto } from './dto/update-nft.dto';
import { CreateNftAttributeDto } from './dto/create-nft-attribute.dto';
import { MintNftDto } from './dto/mint-nft.dto';
import { AirdropNftDto } from './dto/airdrop-nft.dto';
import { CreateNftCollectionDto } from './dto/create-nft-collection.dto';
import { UpdateNftCollectionDto } from './dto/update-nft-collection.dto';
import { BlockchainService } from './blockchain.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NftService {
    private readonly logger = new Logger(NftService.name);

    constructor(
        @InjectModel(Nft.name) private nftModel: Model<NftDocument>,
        @InjectModel(NftAttribute.name) private nftAttributeModel: Model<NftAttributeDocument>,
        @InjectModel(NftItem.name) private nftItemModel: Model<NftItemDocument>,
        @InjectModel(NftCollection.name) private nftCollectionModel: Model<NftCollectionDocument>,
        @InjectModel(NftTransaction.name) private nftTransactionModel: Model<NftTransactionDocument>,
        private readonly blockchainService: BlockchainService,
        private readonly configService: ConfigService,
    ) { }

    // ───────────────── NFT CRUD (Admin) ─────────────────

    async create(creatorId: string, dto: CreateNftDto): Promise<NftDocument> {
        if (dto.collectionId) {
            const collection = await this.nftCollectionModel.findById(dto.collectionId);
            if (!collection) throw new NotFoundException('Collection not found');
        }
        const nft = new this.nftModel({
            ...dto,
            creatorId: new Types.ObjectId(creatorId),
            collectionId: dto.collectionId ? new Types.ObjectId(dto.collectionId) : undefined,
            compatibleGames: dto.compatibleGames?.map((id) => new Types.ObjectId(id)) || [],
        });
        return nft.save();
    }

    async findAll(filters?: { category?: string; rarity?: string; status?: string; collectionId?: string }): Promise<NftDocument[]> {
        const query: any = {};
        if (filters?.category) query.category = filters.category;
        if (filters?.rarity) query.rarity = filters.rarity;
        if (filters?.status) query.status = filters.status;
        if (filters?.collectionId) query.collectionId = new Types.ObjectId(filters.collectionId);
        return this.nftModel.find(query).populate('compatibleGames', 'title genre').populate('collectionId', 'name category').exec();
    }

    async findOne(id: string): Promise<NftDocument> {
        const nft = await this.nftModel
            .findById(id)
            .populate('compatibleGames', 'title genre')
            .populate('creatorId', 'nickname email')
            .exec();
        if (!nft) throw new NotFoundException('NFT not found');
        return nft;
    }

    async update(id: string, dto: UpdateNftDto): Promise<NftDocument> {
        const updateData: any = { ...dto };
        if (dto.compatibleGames) {
            updateData.compatibleGames = dto.compatibleGames.map((gId) => new Types.ObjectId(gId));
        }
        const nft = await this.nftModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!nft) throw new NotFoundException('NFT not found');
        return nft;
    }

    async remove(id: string): Promise<void> {
        const nft = await this.nftModel.findById(id);
        if (!nft) throw new NotFoundException('NFT not found');
        if (nft.status === 'MINTED') {
            throw new BadRequestException('Cannot delete a minted NFT');
        }
        await this.nftAttributeModel.deleteMany({ nftId: nft._id });
        await this.nftModel.findByIdAndDelete(id);
    }

    // ───────────────── NFT Attributes ─────────────────

    async addAttribute(dto: CreateNftAttributeDto): Promise<NftAttributeDocument> {
        const nft = await this.nftModel.findById(dto.nftId);
        if (!nft) throw new NotFoundException('NFT not found');
        const attr = new this.nftAttributeModel({
            ...dto,
            nftId: new Types.ObjectId(dto.nftId),
        });
        return attr.save();
    }

    async getAttributes(nftId: string): Promise<NftAttributeDocument[]> {
        return this.nftAttributeModel.find({ nftId: new Types.ObjectId(nftId) }).exec();
    }

    async removeAttribute(attributeId: string): Promise<void> {
        const result = await this.nftAttributeModel.findByIdAndDelete(attributeId);
        if (!result) throw new NotFoundException('Attribute not found');
    }

    // ───────────────── Minting (Blockchain) ─────────────────

    async mintNft(adminId: string, dto: MintNftDto): Promise<NftItemDocument> {
        const nft = await this.nftModel.findById(dto.nftId);
        if (!nft) throw new NotFoundException('NFT not found');
        if (nft.status === 'BURNED') throw new BadRequestException('Cannot mint a burned NFT');

        if (nft.maxSupply > 0 && nft.supply >= nft.maxSupply) {
            throw new BadRequestException('Max supply reached for this NFT');
        }

        const contractAddress = this.configService.get<string>('NFT_CONTRACT_ADDRESS');
        let tokenId: string | undefined;
        let transactionHash: string | undefined;

        if (this.blockchainService.isMintingEnabled() && contractAddress) {
            const attributes = await this.getAttributes(dto.nftId);
            const tokenMetadata = {
                name: nft.name,
                description: nft.description || '',
                image: nft.imageUrl || '',
                attributes: attributes.map((attr) => ({
                    trait_type: attr.traitType,
                    value: attr.numericValue ?? attr.value,
                    ...(attr.displayType ? { display_type: attr.displayType } : {}),
                    ...(attr.maxValue ? { max_value: attr.maxValue } : {}),
                })),
                external_url: nft.externalUrl || '',
                ...nft.metadata,
            };

            const ipfsHash = await this.mockIpfsUpload(tokenMetadata);
            const tokenUri = `ipfs://${ipfsHash}`;

            const result = await this.blockchainService.mintNft({
                toAddress: dto.walletAddress,
                tokenUri,
                contractAddress,
            });

            tokenId = result.tokenId;
            transactionHash = result.transactionHash;

            nft.tokenId = tokenId;
            nft.contractAddress = contractAddress;
            nft.transactionHash = transactionHash;
            nft.status = 'MINTED';
            nft.mintedAt = new Date();
            await nft.save();
        } else {
            this.logger.warn('Blockchain minting not configured — creating NFT item without on-chain mint');
            nft.status = 'MINTED';
            nft.mintedAt = new Date();
            await nft.save();
        }

        const nftItem = new this.nftItemModel({
            nftId: nft._id,
            ownerId: new Types.ObjectId(adminId),
            walletAddress: dto.walletAddress,
            tokenId,
            transactionHash,
            edition: nft.supply,
            status: 'OWNED',
            acquiredAt: new Date(),
            acquiredVia: 'MINTED',
        });

        return nftItem.save();
    }

    // ───────────────── Airdrop (Admin sends NFT to user) ─────────────────

    async airdropNft(adminId: string, dto: AirdropNftDto): Promise<NftItemDocument> {
        const nft = await this.nftModel.findById(dto.nftId);
        if (!nft) throw new NotFoundException('NFT not found');

        if (nft.maxSupply > 0 && nft.supply >= nft.maxSupply) {
            throw new BadRequestException('Max supply reached for this NFT');
        }

        nft.supply += 1;
        await nft.save();

        const nftItem = new this.nftItemModel({
            nftId: nft._id,
            ownerId: new Types.ObjectId(dto.toUserId),
            walletAddress: dto.walletAddress || null,
            edition: nft.supply,
            status: 'OWNED',
            acquiredAt: new Date(),
            acquiredVia: 'AIRDROP',
        });

        return nftItem.save();
    }

    // ───────────────── NFT Items queries ─────────────────

    async getItemsByOwner(ownerId: string): Promise<NftItemDocument[]> {
        return this.nftItemModel
            .find({ ownerId: new Types.ObjectId(ownerId) })
            .populate({
                path: 'nftId',
                populate: { path: 'compatibleGames', select: 'title genre' },
            })
            .exec();
    }

    async getItemById(itemId: string): Promise<NftItemDocument> {
        const item = await this.nftItemModel
            .findById(itemId)
            .populate({
                path: 'nftId',
                populate: { path: 'compatibleGames', select: 'title genre' },
            })
            .exec();
        if (!item) throw new NotFoundException('NFT Item not found');
        return item;
    }

    async transferItem(fromUserId: string, nftItemId: string, toUserId: string, toWalletAddress: string): Promise<NftItemDocument> {
        const item = await this.nftItemModel.findById(nftItemId).populate('nftId');
        if (!item) throw new NotFoundException('NFT Item not found');
        if (item.ownerId.toString() !== fromUserId) {
            throw new BadRequestException('You do not own this item');
        }
        if (item.status === 'EQUIPPED') {
            throw new BadRequestException('Unequip the item before transferring');
        }

        const nft = item.nftId as any;
        if (!nft.isTradeable) {
            throw new BadRequestException('This NFT is not tradeable');
        }

        if (this.blockchainService.isMintingEnabled() && item.tokenId && nft.contractAddress) {
            const result = await this.blockchainService.transferNft({
                contractAddress: nft.contractAddress,
                fromAddress: item.walletAddress || this.blockchainService.getWalletAddress()!,
                toAddress: toWalletAddress,
                tokenId: item.tokenId,
            });
            item.transactionHash = result.transactionHash;
        }

        item.ownerId = new Types.ObjectId(toUserId);
        item.walletAddress = toWalletAddress;
        item.status = 'TRANSFERRED';
        item.acquiredVia = 'TRANSFER';
        item.acquiredAt = new Date();
        return item.save();
    }

    // ───────────────── Stats ─────────────────

    async getStats(): Promise<any> {
        const totalNfts = await this.nftModel.countDocuments();
        const totalMinted = await this.nftModel.countDocuments({ status: 'MINTED' });
        const totalItems = await this.nftItemModel.countDocuments();
        const byCategory = await this.nftModel.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);
        const byRarity = await this.nftModel.aggregate([
            { $group: { _id: '$rarity', count: { $sum: 1 } } },
        ]);
        const totalCollections = await this.nftCollectionModel.countDocuments();
        return { totalNfts, totalMinted, totalItems, totalCollections, byCategory, byRarity };
    }

    // ───────────────── NFT Collections ─────────────────

    async createCollection(creatorId: string, dto: CreateNftCollectionDto): Promise<NftCollectionDocument> {
        const collection = new this.nftCollectionModel({
            ...dto,
            creatorId: new Types.ObjectId(creatorId),
            compatibleGames: dto.compatibleGames?.map((id) => new Types.ObjectId(id)) || [],
        });
        return collection.save();
    }

    async findAllCollections(filters?: { category?: string; isActive?: boolean }): Promise<NftCollectionDocument[]> {
        const query: any = {};
        if (filters?.category) query.category = filters.category;
        if (filters?.isActive !== undefined) query.isActive = filters.isActive;
        return this.nftCollectionModel.find(query)
            .populate('creatorId', 'nickname email')
            .populate('compatibleGames', 'title genre')
            .exec();
    }

    async findOneCollection(id: string): Promise<NftCollectionDocument> {
        const collection = await this.nftCollectionModel
            .findById(id)
            .populate('creatorId', 'nickname email')
            .populate('compatibleGames', 'title genre')
            .exec();
        if (!collection) throw new NotFoundException('Collection not found');
        return collection;
    }

    async updateCollection(id: string, dto: UpdateNftCollectionDto): Promise<NftCollectionDocument> {
        const updateData: any = { ...dto };
        if (dto.compatibleGames) {
            updateData.compatibleGames = dto.compatibleGames.map((gId) => new Types.ObjectId(gId));
        }
        const collection = await this.nftCollectionModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!collection) throw new NotFoundException('Collection not found');
        return collection;
    }

    async removeCollection(id: string): Promise<void> {
        const nftsInCollection = await this.nftModel.countDocuments({ collectionId: new Types.ObjectId(id) });
        if (nftsInCollection > 0) {
            throw new BadRequestException(`Cannot delete collection — it contains ${nftsInCollection} NFTs. Remove or reassign them first.`);
        }
        const result = await this.nftCollectionModel.findByIdAndDelete(id);
        if (!result) throw new NotFoundException('Collection not found');
    }

    async getCollectionNfts(collectionId: string): Promise<NftDocument[]> {
        return this.nftModel
            .find({ collectionId: new Types.ObjectId(collectionId) })
            .populate('compatibleGames', 'title genre')
            .exec();
    }

    // ───────────────── Marketplace ─────────────────

    async getMarketplace(filters?: { search?: string; rarity?: string; isFeatured?: boolean }): Promise<NftItemDocument[]> {
        const query: any = { status: 'LISTED' };

        if (filters?.isFeatured !== undefined) {
            query.isFeatured = filters.isFeatured;
        }

        let items = await this.nftItemModel
            .find(query)
            .populate({
                path: 'nftId',
                populate: { path: 'compatibleGames', select: 'title genre' },
            })
            .populate('ownerId', 'nickname email username')
            .exec();

        if (filters?.rarity && filters.rarity !== 'ALL') {
            items = items.filter(item => (item.nftId as any).rarity === filters.rarity);
        }

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            items = items.filter(item =>
                (item.nftId as any).name.toLowerCase().includes(searchLower) ||
                (item.nftId as any).description?.toLowerCase().includes(searchLower)
            );
        }

        return items;
    }

    async getAdminMarketplace(): Promise<NftItemDocument[]> {
        return this.nftItemModel
            .find({ status: 'LISTED' })
            .populate({
                path: 'nftId',
                populate: { path: 'compatibleGames', select: 'title genre' },
            })
            .populate('ownerId', 'nickname email username')
            .sort({ createdAt: -1 })
            .exec();
    }

    async toggleFeatured(itemId: string): Promise<NftItemDocument> {
        const item = await this.nftItemModel.findById(itemId);
        if (!item) throw new NotFoundException('NFT Item not found');
        item.isFeatured = !item.isFeatured;
        return item.save();
    }

    async forceUnlist(itemId: string): Promise<NftItemDocument> {
        const item = await this.nftItemModel.findById(itemId);
        if (!item) throw new NotFoundException('NFT Item not found');
        item.status = 'OWNED';
        item.listPrice = 0;
        item.isFeatured = false;
        const savedItem = await item.save();

        await new this.nftTransactionModel({
            nftItemId: item._id,
            type: 'UNLIST',
            metadata: { reason: 'ADMIN_FORCE_UNLIST' },
        }).save();

        return savedItem;
    }

    async getMarketplaceStats(): Promise<any> {
        const listedItems = await this.nftItemModel.find({ status: 'LISTED' }).exec();
        const totalVolume = await this.nftTransactionModel.aggregate([
            { $match: { type: 'SALE' } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]);

        const recentSales = await this.nftTransactionModel.countDocuments({ type: 'SALE', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

        return {
            totalListed: listedItems.length,
            totalVolume: totalVolume[0]?.total || 0,
            recentSales,
            floorPrice: listedItems.length > 0 ? Math.min(...listedItems.map(i => i.listPrice)) : 0,
        };
    }

    async listForSale(userId: string, itemId: string, listPrice: number): Promise<NftItemDocument> {
        const item = await this.nftItemModel.findById(itemId);
        if (!item) throw new NotFoundException('NFT Item not found');
        if (item.ownerId.toString() !== userId) {
            throw new BadRequestException('You do not own this item');
        }
        if (item.status === 'EQUIPPED') {
            throw new BadRequestException('Unequip the item before listing');
        }

        item.status = 'LISTED';
        item.listPrice = listPrice;
        const savedItem = await item.save();

        // Record transaction
        await new this.nftTransactionModel({
            nftItemId: item._id,
            fromUserId: new Types.ObjectId(userId),
            type: 'LIST',
            price: listPrice,
            currency: 'AC',
        }).save();

        return savedItem;
    }

    async unlist(userId: string, itemId: string): Promise<NftItemDocument> {
        const item = await this.nftItemModel.findById(itemId);
        if (!item) throw new NotFoundException('NFT Item not found');
        if (item.ownerId.toString() !== userId) {
            throw new BadRequestException('You do not own this item');
        }
        if (item.status !== 'LISTED') {
            throw new BadRequestException('Item is not listed');
        }

        item.status = 'OWNED';
        const savedItem = await item.save();

        // Record transaction
        await new this.nftTransactionModel({
            nftItemId: item._id,
            fromUserId: new Types.ObjectId(userId),
            type: 'UNLIST',
            price: 0,
            currency: 'AC',
        }).save();

        return savedItem;
    }

    async buy(buyerId: string, itemId: string): Promise<NftItemDocument> {
        const item = await this.nftItemModel.findById(itemId).populate('nftId');
        if (!item) throw new NotFoundException('NFT Item not found');
        if (item.status !== 'LISTED') {
            throw new BadRequestException('Item is not for sale');
        }
        if (item.ownerId.toString() === buyerId) {
            throw new BadRequestException('You already own this item');
        }

        const sellerId = item.ownerId;
        const price = item.listPrice;

        // TODO: Integrate with real currency/payment system here
        // For now, we just transfer ownership

        item.ownerId = new Types.ObjectId(buyerId);
        item.status = 'OWNED';
        item.acquiredAt = new Date();
        item.acquiredVia = 'PURCHASED';
        const savedItem = await item.save();

        // Record transaction
        await new this.nftTransactionModel({
            nftItemId: item._id,
            fromUserId: sellerId,
            toUserId: new Types.ObjectId(buyerId),
            type: 'SALE',
            price: price,
            currency: 'AC',
        }).save();

        return savedItem;
    }

    async getTransactionHistory(limit = 20): Promise<any[]> {
        return this.nftTransactionModel
            .find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({
                path: 'nftItemId',
                populate: { path: 'nftId', select: 'name imageUrl' },
            })
            .populate('fromUserId', 'nickname username')
            .populate('toUserId', 'nickname username')
            .exec();
    }

    private async mockIpfsUpload(data: any): Promise<string> {
        this.logger.log('Mocking IPFS upload for metadata...');
        // Simulate CID generation
        const hash = Buffer.from(JSON.stringify(data)).toString('hex').slice(0, 32);
        return `Qm${hash}ArenaChain`;
    }
}
