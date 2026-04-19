import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Req,
    Query,
    UseGuards,
    ServiceUnavailableException,
    BadRequestException,
    ForbiddenException,
    DefaultValuePipe,
    ParseIntPipe,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlockchainService } from '../nft/blockchain.service';
import { InventoryService } from '../nft/inventory.service.js';
import { CreditTestGameTokenDto } from './dto/credit-test-game-token.dto';
import { ConfirmBurnDto } from './dto/confirm-burn.dto';
import { LinkGameTokenWalletDto } from './dto/link-game-token-wallet.dto';
import { SpendSimulatedDto } from './dto/spend-simulated.dto';
import { CurrencyLedgerService } from './currency-ledger.service';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
    private readonly logger = new Logger(CurrencyController.name);

    constructor(
        private readonly blockchainService: BlockchainService,
        private readonly inventoryService: InventoryService,
        private readonly configService: ConfigService,
        private readonly currencyLedgerService: CurrencyLedgerService,
    ) {}

    private isTestCreditMintAllowed(): boolean {
        const v =
            this.configService.get<string>('GTK_ALLOW_TEST_CREDIT')?.trim() ||
            process.env.GTK_ALLOW_TEST_CREDIT?.trim();
        return v?.toLowerCase() === 'true' || v === '1';
    }

    private isPurchaseSimulationAllowed(): boolean {
        const v =
            this.configService.get<string>('GTK_ALLOW_PURCHASE_SIMULATION')?.trim() ||
            process.env.GTK_ALLOW_PURCHASE_SIMULATION?.trim();
        return v?.toLowerCase() === 'true' || v === '1';
    }

    private isEconomySpendSimulationAllowed(): boolean {
        const v =
            this.configService.get<string>('GTK_ALLOW_ECONOMY_SIMULATION')?.trim() ||
            process.env.GTK_ALLOW_ECONOMY_SIMULATION?.trim();
        return v?.toLowerCase() === 'true' || v === '1';
    }

    private economyFlags() {
        const testCreditMintAvailable = this.isTestCreditMintAllowed() && this.blockchainService.isMintingEnabled();
        const purchaseSimulationAvailable =
            this.isPurchaseSimulationAllowed() && this.blockchainService.isMintingEnabled();
        const economySpendSimulationAvailable = this.isEconomySpendSimulationAllowed();
        return { testCreditMintAvailable, purchaseSimulationAvailable, economySpendSimulationAvailable };
    }

    /** When true (default), first GET /game-token/me creates an inventory wallet address for the player (no MetaMask link). */
    private isAutoProvisionAppWallet(): boolean {
        const v =
            this.configService.get<string>('GTK_AUTO_PROVISION_APP_WALLET')?.trim() ||
            process.env.GTK_AUTO_PROVISION_APP_WALLET?.trim() ||
            'true';
        return v.toLowerCase() === 'true' || v === '1' || v.toLowerCase() === 'yes';
    }

    /** Mint whole tokens to the user’s linked wallet; caller must already check flags + config. */
    private async mintWholeToLinkedWallet(userId: string, wholeAmount: number) {
        const meta = await this.blockchainService.resolveGameTokenMetadataForApi();
        if (!meta) {
            throw new ServiceUnavailableException('Game token metadata unavailable');
        }
        const inventory = await this.inventoryService.getOrCreateInventory(userId);
        if (!inventory.walletAddress) {
            throw new BadRequestException('Link a wallet first.');
        }
        const wei = ethers.utils.parseUnits(String(wholeAmount), meta.decimals);
        const { transactionHash } = await this.blockchainService.mintGameToken(inventory.walletAddress, wei);
        return {
            meta,
            walletAddress: inventory.walletAddress,
            transactionHash,
            amountWei: wei.toString(),
            amountFormatted: ethers.utils.formatUnits(wei, meta.decimals),
        };
    }

    private async safeLedgerIn(params: {
        userId: string;
        walletAddress: string;
        category: string;
        title: string;
        amountWei: string;
        amountFormatted: string;
        decimals: number;
        chainId: number;
        txHash: string;
        meta?: Record<string, unknown>;
    }): Promise<boolean> {
        try {
            await this.currencyLedgerService.append({
                userId: params.userId,
                walletAddress: params.walletAddress,
                direction: 'in',
                category: params.category,
                amountWei: params.amountWei,
                amountFormatted: params.amountFormatted,
                decimals: params.decimals,
                chainId: params.chainId,
                txHash: params.txHash,
                title: params.title,
                meta: params.meta,
            });
            return true;
        } catch (e: any) {
            this.logger.error(`Ledger in failed after mint (tx ${params.txHash}): ${e?.message || e}`);
            return false;
        }
    }

    @Get('game-token/config')
    @ApiOperation({
        summary: 'GTK contract metadata (public)',
        description:
            'Returns GameToken (ERC-20) address and symbol for UI. No auth — contract addresses are public on-chain.',
    })
    @ApiResponse({ status: 200, description: 'Token metadata' })
    @ApiResponse({ status: 503, description: 'GTK not configured on server' })
    async getGameTokenConfig() {
        const meta = await this.blockchainService.resolveGameTokenMetadataForApi();
        if (!meta) {
            const diag = await this.blockchainService.diagnoseGameToken();
            if (diag.code !== 'OK') {
                throw new ServiceUnavailableException({
                    statusCode: 503,
                    error: 'Service Unavailable',
                    message: 'Game token (GTK) is unavailable.',
                    reason: diag.code,
                    hints: [
                        ...diag.hints,
                        'Non-production: set GAME_TOKEN_CONTRACT_ADDRESS in .env to enable GTK_CONFIG_FALLBACK metadata so the navbar can still show VEX.',
                    ],
                    ...(diag.detail ? { detail: diag.detail } : {}),
                });
            }
            throw new ServiceUnavailableException({
                statusCode: 503,
                error: 'Service Unavailable',
                message: 'Game token contract is present but ERC-20 metadata (name/symbol/decimals) could not be read.',
                reason: 'ERC20_METADATA_FAILED',
                hints: [
                    'Verify GAME_TOKEN_CONTRACT_ADDRESS is the GameToken proxy, not another contract.',
                    'Ensure RPC_URL / Alchemy points at the same chain you deployed on.',
                ],
            });
        }
        return meta;
    }

    @Get('game-token/me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'My GTK balance',
        description:
            'Uses the in-app wallet address on your inventory. When GTK_AUTO_PROVISION_APP_WALLET is true (default), the API creates an EVM address for the player on first request (no external wallet linking).',
    })
    @ApiResponse({ status: 200, description: 'Balance or link status' })
    async getMyGameToken(@Req() req: { user: { userId: string } }) {
        if (!this.blockchainService.getGameTokenContractAddress()) {
            throw new ServiceUnavailableException(
                'Game token is not configured — set GAME_TOKEN_CONTRACT_ADDRESS in the API .env',
            );
        }

        let inventory = await this.inventoryService.getOrCreateInventory(req.user.userId);
        if (!inventory.walletAddress && this.isAutoProvisionAppWallet()) {
            await this.inventoryService.ensureAppWallet(req.user.userId);
            inventory = await this.inventoryService.getOrCreateInventory(req.user.userId);
        }
        const walletAddress = inventory.walletAddress;
        const branding = await this.blockchainService.resolveGameTokenMetadataForApi();
        if (!branding) {
            throw new ServiceUnavailableException(
                'Game token metadata unavailable — set GAME_TOKEN_CONTRACT_ADDRESS (and optionally GTK_CONFIG_FALLBACK=false only if you want to disable .env fallback).',
            );
        }
        const flags = this.economyFlags();
        const appManagedWallet = Boolean(walletAddress);

        if (!walletAddress) {
            const dec = branding.decimals ?? 18;
            const zero = this.blockchainService.getZeroBalanceDisplay(dec);
            return {
                linked: false,
                walletAddress: null as string | null,
                balanceRaw: zero.balanceRaw,
                balanceFormatted: zero.balanceFormatted,
                symbol: branding.symbol ?? null,
                decimals: dec,
                chainId: branding.chainId ?? null,
                displayName: branding.displayName ?? null,
                displaySymbol: branding.displaySymbol ?? null,
                hint: 'Enable GTK_AUTO_PROVISION_APP_WALLET (default) so the API can create your in-app wallet address.',
                appManagedWallet: false,
                ...(branding.degraded ? { degraded: true as const } : {}),
                ...flags,
            };
        }

        if (!this.blockchainService.isGameTokenConfigured()) {
            const zero = this.blockchainService.getZeroBalanceDisplay(branding.decimals);
            return {
                linked: true,
                walletAddress,
                balanceRaw: zero.balanceRaw,
                balanceFormatted: zero.balanceFormatted,
                symbol: branding.symbol,
                decimals: branding.decimals,
                chainId: branding.chainId,
                displayName: branding.displayName,
                displaySymbol: branding.displaySymbol,
                degraded: true,
                balanceUnavailableReason:
                    'Cannot reach the chain (JSON-RPC). Balance shown as 0 — start Anvil or fix RPC_URL, then refresh.',
                appManagedWallet,
                ...flags,
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
                displayName: bal.displayName,
                displaySymbol: bal.displaySymbol,
                appManagedWallet,
                ...flags,
            };
        } catch (e: any) {
            const msg = e?.message || 'Failed to read GTK balance';
            this.logger.warn(`GET game-token/me: GTK on-chain read failed for ${walletAddress}: ${msg}`);
            const zero = this.blockchainService.getZeroBalanceDisplay(branding.decimals);
            return {
                linked: true,
                walletAddress,
                balanceRaw: zero.balanceRaw,
                balanceFormatted: zero.balanceFormatted,
                symbol: branding.symbol,
                decimals: branding.decimals,
                chainId: branding.chainId,
                displayName: branding.displayName,
                displaySymbol: branding.displaySymbol,
                degraded: true,
                balanceUnavailableReason: msg,
                appManagedWallet,
                ...flags,
            };
        }
    }

    @Get('game-token/ledger')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Paginated in/out history for your game token wallet' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 20 })
    async getGameTokenLedger(
        @Req() req: { user: { userId: string } },
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const p = Math.max(1, page);
        const l = Math.min(50, Math.max(1, limit));
        const { items, total } = await this.currencyLedgerService.findByUserId(req.user.userId, p, l);
        return {
            items,
            total,
            page: p,
            limit: l,
            totalPages: Math.max(1, Math.ceil(total / l)),
        };
    }

    @Patch('game-token/wallet')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiBody({ type: LinkGameTokenWalletDto })
    @ApiOperation({
        summary: 'Link MetaMask / external EOA for GTK',
        description:
            'Sets your inventory walletAddress to the given 0x address (checksum-normalized). Use after eth_requestAccounts in the browser. Replaces a previously auto-provisioned in-app address.',
    })
    @ApiResponse({ status: 200 })
    async linkMyGameTokenWallet(
        @Req() req: { user: { userId: string } },
        @Body() dto: LinkGameTokenWalletDto,
    ) {
        const inv = await this.inventoryService.linkExternalWallet(req.user.userId, dto.walletAddress);
        return {
            ok: true,
            walletAddress: inv.walletAddress,
        };
    }

    @Get('game-token/wallet')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'My linked wallet (for game currency)',
        description:
            'Returns whether a wallet is linked and the GTK chain/contract. Balance is on GET /currency/game-token/me.',
    })
    @ApiResponse({ status: 200 })
    async getMyGameTokenWallet(@Req() req: { user: { userId: string } }) {
        if (!this.blockchainService.getGameTokenContractAddress()) {
            throw new ServiceUnavailableException(
                'Game token is not configured — set GAME_TOKEN_CONTRACT_ADDRESS in the API .env',
            );
        }
        const meta = await this.blockchainService.resolveGameTokenMetadataForApi();
        if (!meta) {
            throw new ServiceUnavailableException(
                'Game token metadata unavailable — set GAME_TOKEN_CONTRACT_ADDRESS and ensure GTK_CONFIG_FALLBACK is not disabled, or fix RPC.',
            );
        }
        const inventory = await this.inventoryService.getOrCreateInventory(req.user.userId);
        const flags = this.economyFlags();
        return {
            linked: !!inventory.walletAddress,
            walletAddress: inventory.walletAddress ?? null,
            chainId: meta.chainId,
            contractAddress: meta.contractAddress,
            displayName: meta.displayName,
            displaySymbol: meta.displaySymbol,
            decimals: meta.decimals,
            ...(meta.degraded ? { degraded: true as const } : {}),
            ...flags,
        };
    }

    /**
     * Dev/staging: mint whole GTK/VEX tokens to the caller’s linked wallet. Requires GTK_ALLOW_TEST_CREDIT=true
     * and a server key that is GameToken owner. Real “buy with card” flows need a payment webhook, not this.
     */
    @Post('game-token/credit-test')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiBody({ type: CreditTestGameTokenDto })
    @ApiOperation({ summary: 'Mint test credits to linked wallet (env-gated)' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 403, description: 'GTK_ALLOW_TEST_CREDIT not enabled' })
    async creditTestGameToken(@Req() req: { user: { userId: string } }, @Body() dto: CreditTestGameTokenDto) {
        if (!this.isTestCreditMintAllowed()) {
            throw new ForbiddenException('Test credit mint is disabled (set GTK_ALLOW_TEST_CREDIT=true to allow).');
        }
        if (!this.blockchainService.isMintingEnabled()) {
            throw new ServiceUnavailableException('Server wallet not configured — set WALLET_PRIVATE_KEY or PRIVATE_KEY');
        }
        if (!this.blockchainService.isGameTokenConfigured()) {
            throw new ServiceUnavailableException('Game token is not configured');
        }
        try {
            const r = await this.mintWholeToLinkedWallet(req.user.userId, dto.wholeAmount);
            const ledgerRecorded = await this.safeLedgerIn({
                userId: req.user.userId,
                walletAddress: r.walletAddress,
                category: 'mint_test',
                title: 'Test credit (mint)',
                amountWei: r.amountWei,
                amountFormatted: r.amountFormatted,
                decimals: r.meta.decimals,
                chainId: r.meta.chainId,
                txHash: r.transactionHash,
                meta: { source: 'credit_test' },
            });
            return {
                ok: true,
                transactionHash: r.transactionHash,
                creditedWhole: dto.wholeAmount,
                walletAddress: r.walletAddress,
                ledgerRecorded,
            };
        } catch (e: any) {
            if (e instanceof BadRequestException || e instanceof ServiceUnavailableException) {
                throw e;
            }
            throw new BadRequestException(
                e?.message || 'Mint failed — is the server key the GameToken contract owner?',
            );
        }
    }

    /**
     * Simulated “buy app currency”: server mints like a purchase after payment would.
     * Replace with Stripe (or similar) webhook → mint in production.
     */
    @Post('game-token/purchase')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiBody({ type: CreditTestGameTokenDto })
    @ApiOperation({ summary: 'Simulated purchase — mint to linked wallet (GTK_ALLOW_PURCHASE_SIMULATION)' })
    async purchaseSimulated(@Req() req: { user: { userId: string } }, @Body() dto: CreditTestGameTokenDto) {
        if (!this.isPurchaseSimulationAllowed()) {
            throw new ForbiddenException(
                'Simulated purchase is disabled (set GTK_ALLOW_PURCHASE_SIMULATION=true for local/staging).',
            );
        }
        if (!this.blockchainService.isMintingEnabled()) {
            throw new ServiceUnavailableException('Server wallet not configured — set WALLET_PRIVATE_KEY or PRIVATE_KEY');
        }
        if (!this.blockchainService.isGameTokenConfigured()) {
            throw new ServiceUnavailableException('Game token is not configured');
        }
        try {
            const r = await this.mintWholeToLinkedWallet(req.user.userId, dto.wholeAmount);
            const ledgerRecorded = await this.safeLedgerIn({
                userId: req.user.userId,
                walletAddress: r.walletAddress,
                category: 'purchase_simulated',
                title: 'Simulated purchase (mint)',
                amountWei: r.amountWei,
                amountFormatted: r.amountFormatted,
                decimals: r.meta.decimals,
                chainId: r.meta.chainId,
                txHash: r.transactionHash,
                meta: { source: 'purchase_simulation' },
            });
            return {
                ok: true,
                transactionHash: r.transactionHash,
                purchasedWhole: dto.wholeAmount,
                walletAddress: r.walletAddress,
                ledgerRecorded,
            };
        } catch (e: any) {
            if (e instanceof BadRequestException || e instanceof ServiceUnavailableException) {
                throw e;
            }
            throw new BadRequestException(
                e?.message || 'Mint failed — is the server key the GameToken contract owner?',
            );
        }
    }

    /**
     * Records an on-chain burn as a “sell” / outflow in history. User must call GameToken.burn(amount) from MetaMask first.
     */
    @Post('game-token/sell/confirm-burn')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiBody({ type: ConfirmBurnDto })
    @ApiOperation({ summary: 'Confirm token burn (sell) from linked wallet' })
    async confirmBurnSell(@Req() req: { user: { userId: string } }, @Body() dto: ConfirmBurnDto) {
        if (!this.blockchainService.isGameTokenConfigured()) {
            throw new ServiceUnavailableException('Game token is not configured');
        }
        const meta = await this.blockchainService.resolveGameTokenMetadataForApi();
        if (!meta) {
            throw new ServiceUnavailableException('Game token metadata unavailable');
        }
        const inventory = await this.inventoryService.getOrCreateInventory(req.user.userId);
        if (!inventory.walletAddress) {
            throw new BadRequestException('Link a wallet first.');
        }
        let amountWei: string;
        try {
            const v = await this.blockchainService.verifyGameTokenBurnTx(dto.txHash, inventory.walletAddress);
            amountWei = v.amountWei;
        } catch (e: any) {
            throw new BadRequestException(e?.message || 'Could not verify burn transaction');
        }
        const amountFormatted = ethers.utils.formatUnits(amountWei, meta.decimals);
        await this.currencyLedgerService.append({
            userId: req.user.userId,
            walletAddress: inventory.walletAddress,
            direction: 'out',
            category: 'burn_sell',
            amountWei,
            amountFormatted,
            decimals: meta.decimals,
            chainId: meta.chainId,
            txHash: dto.txHash,
            title: 'Tokens burned (sell)',
            meta: { source: 'burn_confirm' },
        });
        return { ok: true, transactionHash: dto.txHash, amountWei, amountFormatted };
    }

    /**
     * Dev only: record spending without a chain tx. Real spends should eventually be user-signed transfers or burns.
     */
    @Post('game-token/spend-simulated')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiBody({ type: SpendSimulatedDto })
    @ApiOperation({ summary: 'Record simulated spend (GTK_ALLOW_ECONOMY_SIMULATION)' })
    async spendSimulated(@Req() req: { user: { userId: string } }, @Body() dto: SpendSimulatedDto) {
        if (!this.isEconomySpendSimulationAllowed()) {
            throw new ForbiddenException(
                'Simulated spend is disabled (set GTK_ALLOW_ECONOMY_SIMULATION=true for local demos).',
            );
        }
        const meta = await this.blockchainService.resolveGameTokenMetadataForApi();
        if (!meta) {
            throw new ServiceUnavailableException('Game token metadata unavailable');
        }
        const inventory = await this.inventoryService.getOrCreateInventory(req.user.userId);
        if (!inventory.walletAddress) {
            throw new BadRequestException('Link a wallet first.');
        }
        const wei = ethers.utils.parseUnits(String(dto.wholeAmount), meta.decimals);
        const amountFormatted = ethers.utils.formatUnits(wei, meta.decimals);
        await this.currencyLedgerService.append({
            userId: req.user.userId,
            walletAddress: inventory.walletAddress,
            direction: 'out',
            category: 'spend_simulated',
            amountWei: wei.toString(),
            amountFormatted,
            decimals: meta.decimals,
            chainId: meta.chainId,
            title: dto.reason?.trim() ? `Simulated spend — ${dto.reason.trim()}` : 'Simulated spend (in-app)',
            meta: { source: 'spend_simulation', reason: dto.reason ?? null },
        });
        return { ok: true, recordedWhole: dto.wholeAmount, walletAddress: inventory.walletAddress };
    }
}
