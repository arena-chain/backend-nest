import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Nft, NftDocument } from './schemas/nft.entity';
import { NftAttribute, NftAttributeDocument } from './schemas/nft-attribute.entity';
import { NftItem, NftItemDocument } from './schemas/nft-item.entity';
import { NftCollection, NftCollectionDocument } from './schemas/nft-collection.entity';
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
        private readonly blockchainService: BlockchainService,
        private readonly configService: ConfigService,
    ) {}

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

            const tokenUri = `data:application/json;base64,${Buffer.from(JSON.stringify(tokenMetadata)).toString('base64')}`;

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
}
