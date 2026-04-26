import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req,
    Query,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { NftService } from './nft.service';
import { CreateNftDto } from './dto/create-nft.dto';
import { UpdateNftDto } from './dto/update-nft.dto';
import { CreateNftAttributeDto } from './dto/create-nft-attribute.dto';
import { MintNftDto } from './dto/mint-nft.dto';
import { AirdropNftDto } from './dto/airdrop-nft.dto';
import { TransferNftItemDto } from './dto/transfer-nft-item.dto';
import { CreateNftCollectionDto } from './dto/create-nft-collection.dto';
import { UpdateNftCollectionDto } from './dto/update-nft-collection.dto';
import { imageUploadOptions } from 'src/common/utils/file-upload.utils';

@ApiTags('nft')
@Controller('nft')
export class NftController {
    constructor(private readonly nftService: NftService) {}

    // ───────────────── Admin: NFT CRUD ─────────────────

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new NFT (Admin only)', description: 'Create a new NFT piece — weapon, avatar, skin, etc.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['name', 'category', 'rarity'],
            properties: {
                name: { type: 'string', example: 'Dragon Slayer Sword' },
                description: { type: 'string', example: 'A legendary sword forged in dragon fire' },
                category: { type: 'string', enum: ['WEAPON', 'AVATAR', 'SKIN', 'CHARACTER', 'CONSUMABLE', 'BADGE', 'TROPHY', 'EMOTE', 'ARMOR', 'ACCESSORY', 'OTHER'] },
                rarity: { type: 'string', enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] },
                tags: { type: 'array', items: { type: 'string' } },
                compatibleGames: { type: 'array', items: { type: 'string' } },
                isEquippable: { type: 'boolean' },
                isConsumable: { type: 'boolean' },
                isTradeable: { type: 'boolean' },
                supply: { type: 'number' },
                maxSupply: { type: 'number' },
                externalUrl: { type: 'string' },
                metadata: { type: 'object' },
                file: { type: 'string', format: 'binary', description: 'NFT image file' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'NFT created successfully' })
    @UseInterceptors(FileInterceptor('file', imageUploadOptions))
    create(@Req() req, @Body() dto: CreateNftDto, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            dto.imageUrl = `/uploads/${file.filename}`;
        }
        return this.nftService.create(req.user.userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all NFTs', description: 'List all NFT pieces with optional filters' })
    @ApiQuery({ name: 'category', required: false, enum: ['WEAPON', 'AVATAR', 'SKIN', 'CHARACTER', 'CONSUMABLE', 'BADGE', 'TROPHY', 'EMOTE', 'ARMOR', 'ACCESSORY', 'OTHER'] })
    @ApiQuery({ name: 'rarity', required: false, enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'MINTED', 'LISTED', 'BURNED'] })
    @ApiQuery({ name: 'collectionId', required: false, description: 'Filter by collection ID' })
    @ApiResponse({ status: 200, description: 'List of NFTs' })
    findAll(
        @Query('category') category?: string,
        @Query('rarity') rarity?: string,
        @Query('status') status?: string,
        @Query('collectionId') collectionId?: string,
    ) {
        return this.nftService.findAll({ category, rarity, status, collectionId });
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get NFT statistics (Admin only)' })
    @ApiResponse({ status: 200, description: 'NFT statistics' })
    getStats() {
        return this.nftService.getStats();
    }

    // ───────────────── Admin: NFT Attributes ─────────────────

    @Post('attributes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Add an attribute to an NFT (Admin only)' })
    @ApiResponse({ status: 201, description: 'Attribute added' })
    addAttribute(@Body() dto: CreateNftAttributeDto) {
        return this.nftService.addAttribute(dto);
    }

    @Delete('attributes/:attributeId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Remove an attribute (Admin only)' })
    @ApiParam({ name: 'attributeId', description: 'Attribute ID' })
    @ApiResponse({ status: 200, description: 'Attribute removed' })
    removeAttribute(@Param('attributeId') attributeId: string) {
        return this.nftService.removeAttribute(attributeId);
    }

    // ───────────────── Admin: Minting & Airdrop ─────────────────

    @Post('mint')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Mint an NFT on the blockchain (Admin only)' })
    @ApiResponse({ status: 201, description: 'NFT minted and item created' })
    mint(@Req() req, @Body() dto: MintNftDto) {
        return this.nftService.mintNft(req.user.userId, dto);
    }

    @Post('airdrop')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Airdrop an NFT to a user (Admin only)' })
    @ApiResponse({ status: 201, description: 'NFT airdropped to user' })
    airdrop(@Req() req, @Body() dto: AirdropNftDto) {
        return this.nftService.airdropNft(req.user.userId, dto);
    }

    // ───────────────── User: My Items & Transfer ─────────────────

    @Get('items/my')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get my NFT items' })
    @ApiResponse({ status: 200, description: 'List of NFT items owned by the user' })
    getMyItems(@Req() req) {
        return this.nftService.getItemsByOwner(req.user.userId);
    }

    @Post('items/transfer')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Transfer an NFT item to another user' })
    @ApiResponse({ status: 200, description: 'Item transferred' })
    transfer(@Req() req, @Body() dto: TransferNftItemDto) {
        return this.nftService.transferItem(req.user.userId, dto.nftItemId, dto.toUserId, dto.toWalletAddress);
    }

    @Get('items/:itemId')
    @ApiOperation({ summary: 'Get an NFT item by ID' })
    @ApiParam({ name: 'itemId', description: 'NFT Item ID' })
    @ApiResponse({ status: 200, description: 'NFT item details' })
    getItem(@Param('itemId') itemId: string) {
        return this.nftService.getItemById(itemId);
    }

    // ───────────────── Admin: NFT Collections ─────────────────

    @Post('collections')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create an NFT collection (Admin only)', description: 'Create a collection such as Avatars, Weapons, etc.' })
    @ApiResponse({ status: 201, description: 'Collection created' })
    createCollection(@Req() req, @Body() dto: CreateNftCollectionDto) {
        return this.nftService.createCollection(req.user.userId, dto);
    }

    @Get('collections')
    @ApiOperation({ summary: 'Get all NFT collections' })
    @ApiQuery({ name: 'category', required: false, enum: ['AVATARS', 'WEAPONS', 'SKINS', 'CHARACTERS', 'BADGES', 'TROPHIES', 'ARMOR', 'ACCESSORIES', 'MIXED'] })
    @ApiResponse({ status: 200, description: 'List of collections' })
    findAllCollections(@Query('category') category?: string) {
        return this.nftService.findAllCollections({ category });
    }

    @Get('collections/:collectionId/nfts')
    @ApiOperation({ summary: 'Get all NFTs in a collection' })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'List of NFTs in the collection' })
    getCollectionNfts(@Param('collectionId') collectionId: string) {
        return this.nftService.getCollectionNfts(collectionId);
    }

    @Get('collections/:collectionId')
    @ApiOperation({ summary: 'Get a collection by ID' })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection details' })
    findOneCollection(@Param('collectionId') collectionId: string) {
        return this.nftService.findOneCollection(collectionId);
    }

    @Patch('collections/:collectionId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a collection (Admin only)' })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection updated' })
    updateCollection(@Param('collectionId') collectionId: string, @Body() dto: UpdateNftCollectionDto) {
        return this.nftService.updateCollection(collectionId, dto);
    }

    @Delete('collections/:collectionId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a collection (Admin only)' })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection deleted' })
    removeCollection(@Param('collectionId') collectionId: string) {
        return this.nftService.removeCollection(collectionId);
    }

    // ───────────────── Dynamic :id routes (must be last) ─────────────────

    @Get(':id/attributes')
    @ApiOperation({ summary: 'Get all attributes of an NFT' })
    @ApiParam({ name: 'id', description: 'NFT ID' })
    @ApiResponse({ status: 200, description: 'List of attributes' })
    getAttributes(@Param('id') id: string) {
        return this.nftService.getAttributes(id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get NFT by ID' })
    @ApiParam({ name: 'id', description: 'NFT ID' })
    @ApiResponse({ status: 200, description: 'NFT details with attributes' })
    async findOne(@Param('id') id: string) {
        const nft = await this.nftService.findOne(id);
        const attributes = await this.nftService.getAttributes(id);
        return { ...nft.toObject(), attributes };
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update an NFT (Admin only)' })
    @ApiParam({ name: 'id', description: 'NFT ID' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'NFT updated successfully' })
    @UseInterceptors(FileInterceptor('file', imageUploadOptions))
    update(@Param('id') id: string, @Body() dto: UpdateNftDto, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            dto.imageUrl = `/uploads/${file.filename}`;
        }
        return this.nftService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete an NFT (Admin only)' })
    @ApiParam({ name: 'id', description: 'NFT ID' })
    @ApiResponse({ status: 200, description: 'NFT deleted' })
    remove(@Param('id') id: string) {
        return this.nftService.remove(id);
    }
}
