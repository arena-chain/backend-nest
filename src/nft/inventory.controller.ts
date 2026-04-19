import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Patch,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { EquipItemDto } from './dto/equip-item.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Get()
    @ApiOperation({ summary: 'Get my inventory', description: 'Returns the current user inventory with all items and equipped items' })
    @ApiResponse({ status: 200, description: 'User inventory' })
    getMyInventory(@Req() req) {
        return this.inventoryService.getOrCreateInventory(req.user.userId);
    }

    @Post('add/:nftItemId')
    @ApiOperation({ summary: 'Add an NFT item to inventory' })
    @ApiParam({ name: 'nftItemId', description: 'NFT Item ID to add' })
    @ApiResponse({ status: 200, description: 'Item added to inventory' })
    addItem(@Req() req, @Param('nftItemId') nftItemId: string) {
        return this.inventoryService.addItemToInventory(req.user.userId, nftItemId);
    }

    @Delete('remove/:nftItemId')
    @ApiOperation({ summary: 'Remove an NFT item from inventory' })
    @ApiParam({ name: 'nftItemId', description: 'NFT Item ID to remove' })
    @ApiResponse({ status: 200, description: 'Item removed from inventory' })
    removeItem(@Req() req, @Param('nftItemId') nftItemId: string) {
        return this.inventoryService.removeItemFromInventory(req.user.userId, nftItemId);
    }

    @Post('equip')
    @ApiOperation({ summary: 'Equip an NFT item to a slot', description: 'Equip a weapon, avatar, skin, etc. to a specific slot' })
    @ApiResponse({ status: 200, description: 'Item equipped' })
    equipItem(@Req() req, @Body() dto: EquipItemDto) {
        return this.inventoryService.equipItem(req.user.userId, dto);
    }

    @Post('unequip/:nftItemId')
    @ApiOperation({ summary: 'Unequip an NFT item' })
    @ApiParam({ name: 'nftItemId', description: 'NFT Item ID to unequip' })
    @ApiResponse({ status: 200, description: 'Item unequipped' })
    unequipItem(@Req() req, @Param('nftItemId') nftItemId: string) {
        return this.inventoryService.unequipItem(req.user.userId, nftItemId);
    }

    @Get('equipped')
    @ApiOperation({ summary: 'Get my equipped items', description: 'Returns only the currently equipped items' })
    @ApiResponse({ status: 200, description: 'Equipped items' })
    getEquipped(@Req() req) {
        return this.inventoryService.getEquippedItems(req.user.userId);
    }

    @Patch('wallet/:walletAddress')
    @ApiOperation({ summary: 'Set wallet address on inventory' })
    @ApiParam({ name: 'walletAddress', description: 'Blockchain wallet address' })
    @ApiResponse({ status: 200, description: 'Wallet address updated' })
    setWallet(@Req() req, @Param('walletAddress') walletAddress: string) {
        return this.inventoryService.setWalletAddress(req.user.userId, walletAddress);
    }
}
