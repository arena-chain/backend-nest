import { Controller, Get, Req, UseGuards, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlockchainService } from '../nft/blockchain.service';
import { InventoryService } from '../nft/inventory.service';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
    constructor(
        private readonly blockchainService: BlockchainService,
        private readonly inventoryService: InventoryService,
    ) {}

    @Get('game-token/config')
    @ApiOperation({
        summary: 'GTK contract metadata (public)',
        description:
            'Returns GameToken (ERC-20) address and symbol for UI. No auth — contract addresses are public on-chain.',
    })
    @ApiResponse({ status: 200, description: 'Token metadata' })
    @ApiResponse({ status: 503, description: 'GTK not configured on server' })
    async getGameTokenConfig() {
        const meta = await this.blockchainService.getGameTokenMetadata();
        if (!meta) {
            throw new ServiceUnavailableException(
                'Game token is not configured — set GAME_TOKEN_CONTRACT_ADDRESS and ALCHEMY_API_KEY or RPC_URL',
            );
        }
        return meta;
    }

    @Get('game-token/me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'My GTK balance',
        description:
            'Uses the wallet linked on your inventory (PATCH /api/inventory/wallet/:address). Link the same address you use in MetaMask on the GTK network.',
    })
    @ApiResponse({ status: 200, description: 'Balance or link status' })
    async getMyGameToken(@Req() req: { user: { userId: string } }) {
        if (!this.blockchainService.isGameTokenConfigured()) {
            throw new ServiceUnavailableException(
                'Game token is not configured — set GAME_TOKEN_CONTRACT_ADDRESS and ALCHEMY_API_KEY or RPC_URL',
            );
        }

        const inventory = await this.inventoryService.getOrCreateInventory(req.user.userId);
        const walletAddress = inventory.walletAddress;

        if (!walletAddress) {
            return {
                linked: false,
                walletAddress: null as string | null,
                balanceRaw: null as string | null,
                balanceFormatted: null as string | null,
                symbol: null as string | null,
                decimals: null as number | null,
                hint: 'Link a wallet with PATCH /api/inventory/wallet/{yourChecksummedAddress}',
            };
        }

        try {
            const bal = await this.blockchainService.getGameTokenBalance(walletAddress);
            return {
                linked: true,
                walletAddress,
                balanceRaw: bal.balanceRaw,
                balanceFormatted: bal.balanceFormatted,
                symbol: bal.symbol,
                decimals: bal.decimals,
                chainId: bal.chainId,
            };
        } catch (e: any) {
            throw new BadRequestException(e?.message || 'Failed to read GTK balance');
        }
    }
}
