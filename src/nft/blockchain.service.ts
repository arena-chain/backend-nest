import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';

const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address owner) view returns (uint256)',
];

/** GTK metadata is static on-chain; cache so a polling UI does not hammer JSON-RPC (e.g. Anvil). */
const GTK_METADATA_CACHE_MS_OK = 60_000;
/** Short TTL on RPC errors so Anvil / .env fixes are picked up quickly (UI may poll `/config`). */
const GTK_METADATA_CACHE_MS_ERR = 4_000;
/** Per-wallet balance can change; short TTL only to absorb UI double-fetch / tight polling. */
const GTK_BALANCE_CACHE_MS = 5_000;

type GameTokenMetadata = {
    contractAddress: string;
    /** On-chain ERC-20 name (e.g. GameToken). */
    name: string;
    /** On-chain ERC-20 symbol (e.g. GTK). */
    symbol: string;
    decimals: number;
    chainId: number;
    /** UI label — set GAME_TOKEN_DISPLAY_NAME or defaults to `name`. */
    displayName: string;
    /** Short UI suffix (navbar) — set GAME_TOKEN_DISPLAY_SYMBOL or defaults to `symbol`. */
    displaySymbol: string;
    /** True when `name`/`symbol`/chain are from .env because JSON-RPC could not read the contract. */
    degraded?: boolean;
};

type GameTokenBalanceRow = {
    balanceRaw: string;
    balanceFormatted: string;
    symbol: string;
    decimals: number;
    chainId: number;
    displayName: string;
    displaySymbol: string;
};

@Injectable()
export class BlockchainService implements OnModuleInit {
    private readonly logger = new Logger(BlockchainService.name);
    private gtkEnvFallbackLogged = false;
    private alchemy: Alchemy | undefined;
    private wallet: ethers.Wallet | null = null;
    /** Used for ethers.Contract reads (GTK) and for signing when WALLET_PRIVATE_KEY is set. */
    private jsonRpcProvider: ethers.providers.JsonRpcProvider | null = null;
    private gameTokenContractAddress: string | null = null;
    private gtkMetadataCache: { value: GameTokenMetadata | null; expiresAt: number } | null = null;
    private gtkBalanceCache = new Map<string, { value: GameTokenBalanceRow; expiresAt: number }>();

    constructor(private configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>('ALCHEMY_API_KEY');
        const network = this.configService.get<string>('ALCHEMY_NETWORK') || 'eth-sepolia';
        const rpcUrlFallback =
            this.configService.get<string>('RPC_URL')?.trim() || process.env.RPC_URL?.trim();

        this.gameTokenContractAddress =
            this.configService.get<string>('GAME_TOKEN_CONTRACT_ADDRESS')?.trim() ||
            process.env.GAME_TOKEN_CONTRACT_ADDRESS?.trim() ||
            null;

        const networkMap: Record<string, Network> = {
            'eth-mainnet': Network.ETH_MAINNET,
            'eth-sepolia': Network.ETH_SEPOLIA,
            'polygon-mainnet': Network.MATIC_MAINNET,
            'polygon-mumbai': Network.MATIC_MUMBAI,
        };

        // Prefer RPC_URL for JsonRpcProvider when set (e.g. Anvil). Otherwise ALCHEMY_API_KEY in the
        // shell would point GTK reads at Sepolia/mainnet while GAME_TOKEN lives on 31337 → 503.
        if (rpcUrlFallback) {
            this.jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcUrlFallback);
            this.logger.log(
                'Using RPC_URL for JSON-RPC (GTK / wallet); Alchemy can still be used for NFT SDK only',
            );
        }

        if (apiKey) {
            this.alchemy = new Alchemy({
                apiKey,
                network: networkMap[network] || Network.ETH_SEPOLIA,
            });
            this.logger.log(`Alchemy SDK initialized on network: ${network}`);
            if (!this.jsonRpcProvider) {
                const alchemyUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`;
                this.jsonRpcProvider = new ethers.providers.JsonRpcProvider(alchemyUrl);
                this.logger.log('Using Alchemy HTTP for JSON-RPC (no RPC_URL set)');
            }
        } else {
            this.logger.warn('ALCHEMY_API_KEY not set — Alchemy / NFT helpers will be disabled');
            if (!this.jsonRpcProvider) {
                this.logger.warn('No RPC_URL — GTK JSON-RPC disabled until RPC_URL or ALCHEMY_API_KEY is set');
            }
        }

        const privateKey =
            this.configService.get<string>('WALLET_PRIVATE_KEY')?.trim() ||
            this.configService.get<string>('PRIVATE_KEY')?.trim();
        if (privateKey) {
            if (!this.jsonRpcProvider) {
                this.logger.warn(
                    'WALLET_PRIVATE_KEY set but no RPC — set ALCHEMY_API_KEY or RPC_URL for JSON-RPC',
                );
            } else {
                this.wallet = new ethers.Wallet(privateKey, this.jsonRpcProvider);
                this.logger.log(`Blockchain wallet configured: ${this.wallet.address}`);
            }
        } else {
            this.logger.warn('WALLET_PRIVATE_KEY not set — minting will be disabled');
        }

        if (this.gameTokenContractAddress && !this.jsonRpcProvider) {
            this.logger.warn(
                'GAME_TOKEN_CONTRACT_ADDRESS set but no JSON-RPC (ALCHEMY_API_KEY or RPC_URL) — GTK reads disabled',
            );
        }

        setTimeout(() => {
            void this.logGtkMisconfigHintIfNeeded();
        }, 2000);
    }

    /** After boot, warn in logs when GET /currency/game-token/config would 503 (common after Anvil reset). */
    private async logGtkMisconfigHintIfNeeded(): Promise<void> {
        if (!this.gameTokenContractAddress || !this.jsonRpcProvider) {
            return;
        }
        try {
            const diag = await this.diagnoseGameToken();
            if (diag.code === 'NO_CONTRACT_BYTECODE') {
                this.logger.warn(
                    `[GTK] No bytecode at GAME_TOKEN_CONTRACT_ADDRESS (${diag.detail}). ` +
                        'In non-production, /currency/game-token/config can still 200 using .env fallback (GTK_CONFIG_FALLBACK). Redeploy after a fresh Anvil for real reads.',
                );
            } else if (diag.code === 'RPC_UNREACHABLE') {
                this.logger.warn(
                    `[GTK] Cannot reach JSON-RPC (detail: ${diag.detail || 'n/a'}). ` +
                        'In non-production, config can fall back to .env so the UI still shows VEX/GTK labels.',
                );
            }
        } catch (e: any) {
            this.logger.debug(`GTK startup hint skipped: ${e?.message || e}`);
        }
    }

    isConfigured(): boolean {
        return !!this.alchemy;
    }

    isMintingEnabled(): boolean {
        return !!this.wallet;
    }

    getWalletAddress(): string | null {
        return this.wallet?.address || null;
    }

    isGameTokenConfigured(): boolean {
        return !!this.gameTokenContractAddress && !!this.jsonRpcProvider;
    }

    /** Clears GTK metadata cache (e.g. after Anvil redeploy or RPC recovery). */
    invalidateGameTokenMetadataCache(): void {
        this.gtkMetadataCache = null;
    }

    /**
     * Explains why `/currency/game-token/config` might 503 before hammering ERC-20 `name()`.
     * Call when `getGameTokenMetadata()` returns null.
     */
    async diagnoseGameToken(): Promise<{
        code:
            | 'OK'
            | 'MISSING_GAME_TOKEN_CONTRACT_ADDRESS'
            | 'MISSING_JSON_RPC'
            | 'RPC_UNREACHABLE'
            | 'NO_CONTRACT_BYTECODE'
            | 'INVALID_CONTRACT_ADDRESS';
        hints: string[];
        detail?: string;
    }> {
        const hints: string[] = [];
        if (!this.gameTokenContractAddress) {
            hints.push(
                'Set GAME_TOKEN_CONTRACT_ADDRESS in the API `.env` (checksum from `game-token/broadcast/.../run-latest.json`).',
            );
            return { code: 'MISSING_GAME_TOKEN_CONTRACT_ADDRESS', hints };
        }
        if (!this.jsonRpcProvider) {
            hints.push(
                'Set RPC_URL (e.g. http://127.0.0.1:8545 for Anvil) or ALCHEMY_API_KEY so the API can read the chain.',
                'If the token is on local chain 31337, RPC_URL must be Anvil — not a remote testnet.',
            );
            return { code: 'MISSING_JSON_RPC', hints };
        }
        let checksummed: string;
        try {
            checksummed = ethers.utils.getAddress(this.gameTokenContractAddress);
        } catch {
            hints.push('GAME_TOKEN_CONTRACT_ADDRESS is not a valid 0x-prefixed 20-byte address.');
            return {
                code: 'INVALID_CONTRACT_ADDRESS',
                hints,
                detail: this.gameTokenContractAddress,
            };
        }
        try {
            await this.jsonRpcProvider.getNetwork();
        } catch (e: any) {
            hints.push(
                'Cannot reach JSON-RPC — start Anvil (`anvil`) or fix RPC_URL.',
                'If the API was started before Anvil, restart the Nest process after the chain is up.',
            );
            return { code: 'RPC_UNREACHABLE', hints, detail: e?.message };
        }
        try {
            const bytecode = await this.jsonRpcProvider.getCode(checksummed);
            if (!bytecode || bytecode === '0x') {
                hints.push(
                    'No bytecode at this address (typical after `anvil` reset): state is new but .env still has the old deploy address.',
                    'Redeploy GameToken (`forge script` / your deploy flow), then set GAME_TOKEN_CONTRACT_ADDRESS to the new `contractAddress` in the latest broadcast JSON.',
                );
                return { code: 'NO_CONTRACT_BYTECODE', hints, detail: checksummed };
            }
        } catch (e: any) {
            hints.push('eth_getCode failed — check RPC_URL and that the node is running.');
            return { code: 'RPC_UNREACHABLE', hints, detail: e?.message };
        }
        return { code: 'OK', hints: [] };
    }

    getGameTokenContractAddress(): string | null {
        return this.gameTokenContractAddress;
    }

    /**
     * When JSON-RPC cannot read the contract, still return metadata built from `.env` so the UI can show
     * currency (non-production default: on). Opt out with `GTK_CONFIG_FALLBACK=false`.
     * In production, set `GTK_CONFIG_FALLBACK=true` only if you accept non-chain-verified labels.
     */
    isGameTokenConfigFallbackEnabled(): boolean {
        if (process.env.NODE_ENV === 'production') {
            const v = process.env.GTK_CONFIG_FALLBACK?.trim().toLowerCase();
            return v === 'true' || v === '1';
        }
        const optOut = process.env.GTK_CONFIG_FALLBACK?.trim().toLowerCase();
        if (optOut === 'false' || optOut === '0') {
            return false;
        }
        return true;
    }

    /**
     * Synthetic GTK metadata from env when RPC fails or Anvil was reset (see `isGameTokenConfigFallbackEnabled`).
     */
    getGameTokenEnvFallbackMetadata(): GameTokenMetadata | null {
        if (!this.isGameTokenConfigFallbackEnabled()) {
            return null;
        }
        const rawAddr = this.gameTokenContractAddress?.trim();
        if (!rawAddr) {
            return null;
        }
        let contractAddress: string;
        try {
            contractAddress = ethers.utils.getAddress(rawAddr);
        } catch {
            return null;
        }
        const chainId = Math.round(
            Number(
                this.configService.get<string>('GAME_TOKEN_CHAIN_ID')?.trim() ||
                    process.env.GAME_TOKEN_CHAIN_ID ||
                    31337,
            ) || 31337,
        );
        const decimals = Math.round(
            Number(
                this.configService.get<string>('GAME_TOKEN_DECIMALS')?.trim() ||
                    process.env.GAME_TOKEN_DECIMALS ||
                    18,
            ) || 18,
        );
        const name =
            this.configService.get<string>('GAME_TOKEN_FALLBACK_NAME')?.trim() ||
            process.env.GAME_TOKEN_FALLBACK_NAME?.trim() ||
            'GameToken';
        const symbol =
            this.configService.get<string>('GAME_TOKEN_FALLBACK_SYMBOL')?.trim() ||
            process.env.GAME_TOKEN_FALLBACK_SYMBOL?.trim() ||
            'GTK';
        const { displayName, displaySymbol } = this.gameTokenDisplayLabels(name, symbol);
        if (!this.gtkEnvFallbackLogged) {
            this.gtkEnvFallbackLogged = true;
            this.logger.warn(
                `[GTK] Using .env fallback for token metadata (chainId=${chainId}, decimals=${decimals}). ` +
                    'Start Anvil + deploy GameToken for real on-chain reads.',
            );
        }
        return {
            contractAddress,
            name,
            symbol,
            decimals,
            chainId,
            displayName,
            displaySymbol,
            degraded: true,
        };
    }

    /** RPC metadata if possible, otherwise env fallback when allowed (never caches fallback as RPC success). */
    async resolveGameTokenMetadataForApi(): Promise<GameTokenMetadata | null> {
        let m = await this.getGameTokenMetadata();
        if (!m) {
            this.invalidateGameTokenMetadataCache();
            m = await this.getGameTokenMetadata();
        }
        if (m) {
            return m;
        }
        return this.getGameTokenEnvFallbackMetadata();
    }

    /**
     * Branding for UI; `name` / `symbol` stay on-chain.
     * Uses ConfigService, then `process.env` (covers cwd / load-order quirks), then defaults for GameToken/GTK.
     */
    private gameTokenDisplayLabels(chainName: string, chainSymbol: string): {
        displayName: string;
        displaySymbol: string;
    } {
        const envName =
            this.configService.get<string>('GAME_TOKEN_DISPLAY_NAME')?.trim() ||
            process.env.GAME_TOKEN_DISPLAY_NAME?.trim();
        const envSymbol =
            this.configService.get<string>('GAME_TOKEN_DISPLAY_SYMBOL')?.trim() ||
            process.env.GAME_TOKEN_DISPLAY_SYMBOL?.trim();

        const isDefaultGameToken =
            chainSymbol.toUpperCase() === 'GTK' && chainName.toLowerCase() === 'gametoken';

        const displayName = envName || (isDefaultGameToken ? 'Vex currency' : chainName);
        const displaySymbol = envSymbol || (isDefaultGameToken ? 'VEX' : chainSymbol);
        return { displayName, displaySymbol };
    }

    async getGameTokenMetadata(): Promise<GameTokenMetadata | null> {
        if (!this.isGameTokenConfigured()) {
            this.gtkMetadataCache = null;
            return null;
        }
        const now = Date.now();
        if (this.gtkMetadataCache && now < this.gtkMetadataCache.expiresAt) {
            return this.gtkMetadataCache.value;
        }
        try {
            const contract = new ethers.Contract(
                this.gameTokenContractAddress!,
                ERC20_ABI,
                this.jsonRpcProvider!,
            );
            const [name, symbol, decimals, network] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals(),
                this.jsonRpcProvider!.getNetwork(),
            ]);
            const { displayName, displaySymbol } = this.gameTokenDisplayLabels(name, symbol);
            const row: GameTokenMetadata = {
                contractAddress: ethers.utils.getAddress(this.gameTokenContractAddress!),
                name,
                symbol,
                decimals: Number(decimals),
                chainId: network.chainId,
                displayName,
                displaySymbol,
            };
            this.gtkMetadataCache = {
                value: row,
                expiresAt: now + GTK_METADATA_CACHE_MS_OK,
            };
            return row;
        } catch (err: any) {
            this.logger.warn(
                `GTK metadata RPC failed (${this.gameTokenContractAddress}): ${err?.message || err}`,
            );
            this.gtkMetadataCache = {
                value: null,
                expiresAt: now + GTK_METADATA_CACHE_MS_ERR,
            };
            return null;
        }
    }

    async getGameTokenBalance(holderAddress: string): Promise<GameTokenBalanceRow> {
        if (!this.isGameTokenConfigured()) {
            throw new Error('Game token (GTK) is not configured — set GAME_TOKEN_CONTRACT_ADDRESS and RPC');
        }
        if (!ethers.utils.isAddress(holderAddress)) {
            throw new Error('Invalid wallet address');
        }
        const checksum = ethers.utils.getAddress(holderAddress);
        const tokenAddr = ethers.utils.getAddress(this.gameTokenContractAddress!);
        const provider = this.jsonRpcProvider!;

        let rpcChainId: number | null = null;
        try {
            rpcChainId = (await provider.getNetwork()).chainId;
        } catch {
            /* below */
        }

        const code = await provider.getCode(tokenAddr);
        if (!code || code === '0x') {
            throw new Error(
                `No bytecode at GAME_TOKEN_CONTRACT_ADDRESS ${tokenAddr}` +
                    (rpcChainId != null ? ` on RPC chainId ${rpcChainId}` : '') +
                `. After a fresh Anvil reset, redeploy GameToken and paste the new contractAddress into .env. ` +
                `Confirm RPC_URL points at the same chain (e.g. http://127.0.0.1:8545 for local Anvil).`,
            );
        }

        const now = Date.now();
        const hit = this.gtkBalanceCache.get(checksum);
        if (hit && now < hit.expiresAt) {
            return hit.value;
        }
        const contract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
        let raw: ethers.BigNumber;
        let symbol: string;
        let decimals: ethers.BigNumberish;
        let network: ethers.providers.Network;
        let chainName: string;
        try {
            [raw, symbol, decimals, network, chainName] = await Promise.all([
                contract.balanceOf(checksum),
                contract.symbol(),
                contract.decimals(),
                provider.getNetwork(),
                contract.name(),
            ]);
        } catch (err: any) {
            const method = typeof err?.method === 'string' ? err.method : 'ERC-20 view call';
            let chainLabel = rpcChainId != null ? String(rpcChainId) : '?';
            try {
                chainLabel = String((await provider.getNetwork()).chainId);
            } catch {
                /* keep chainLabel */
            }
            throw new Error(
                `GTK contract read failed at ${tokenAddr} (RPC chainId ${chainLabel}, holder ${checksum}). ` +
                    `${method} reverted — ${err?.message || String(err)}. ` +
                    `Fix: align GAME_TOKEN_CONTRACT_ADDRESS with a GameToken deploy on this RPC chain, or fix RPC_URL / ALCHEMY_NETWORK.`,
            );
        }
        const decimalsNum = Number(decimals);
        const { displayName, displaySymbol } = this.gameTokenDisplayLabels(chainName, symbol);
        const row: GameTokenBalanceRow = {
            balanceRaw: raw.toString(),
            balanceFormatted: ethers.utils.formatUnits(raw, decimalsNum),
            symbol,
            decimals: decimalsNum,
            chainId: network.chainId,
            displayName,
            displaySymbol,
        };
        this.gtkBalanceCache.set(checksum, {
            value: row,
            expiresAt: now + GTK_BALANCE_CACHE_MS,
        });
        if (this.gtkBalanceCache.size > 64) {
            for (const [k, v] of this.gtkBalanceCache) {
                if (now >= v.expiresAt) {
                    this.gtkBalanceCache.delete(k);
                }
            }
        }
        return row;
    }

    /** Display payload when the user has no linked wallet yet (treat as 0 balance in UI). */
    getZeroBalanceDisplay(decimals: number): Pick<GameTokenBalanceRow, 'balanceRaw' | 'balanceFormatted'> {
        return {
            balanceRaw: '0',
            balanceFormatted: ethers.utils.formatUnits(ethers.constants.Zero, decimals),
        };
    }

    invalidateGameTokenBalanceCache(holderAddress: string): void {
        if (!ethers.utils.isAddress(holderAddress)) {
            return;
        }
        this.gtkBalanceCache.delete(ethers.utils.getAddress(holderAddress));
    }

    /**
     * Mints ERC-20 to `toAddress` via GameToken.mint (onlyOwner). The server key must own the contract.
     */
    async mintGameToken(toAddress: string, amountWei: ethers.BigNumberish): Promise<{ transactionHash: string }> {
        if (!this.wallet) {
            throw new Error('Minting is not configured — set WALLET_PRIVATE_KEY or PRIVATE_KEY in .env');
        }
        if (!this.isGameTokenConfigured()) {
            throw new Error('Game token (GTK) is not configured');
        }
        if (!ethers.utils.isAddress(toAddress)) {
            throw new Error('Invalid recipient address');
        }
        const checksum = ethers.utils.getAddress(toAddress);
        const mintAbi = ['function mint(address to, uint256 amount) external'];
        const contract = new ethers.Contract(this.gameTokenContractAddress!, mintAbi, this.wallet);
        const tx = await contract.mint(checksum, amountWei);
        const receipt = await tx.wait();
        this.invalidateGameTokenBalanceCache(checksum);
        this.logger.log(`GameToken mint — tx: ${receipt.transactionHash}, to: ${checksum}`);
        return { transactionHash: receipt.transactionHash };
    }

    /**
     * Confirms an ERC-20 burn: Transfer(holder, address(0), value) emitted by the GTK contract.
     */
    async verifyGameTokenBurnTx(txHash: string, fromAddress: string): Promise<{ amountWei: string }> {
        if (!this.isGameTokenConfigured() || !this.jsonRpcProvider) {
            throw new Error('Game token is not configured');
        }
        const receipt = await this.jsonRpcProvider.getTransactionReceipt(txHash);
        if (!receipt) {
            throw new Error('Transaction receipt not found');
        }
        if (receipt.status !== 1) {
            throw new Error('Transaction failed on-chain');
        }
        const tokenAddr = ethers.utils.getAddress(this.gameTokenContractAddress!);
        const from = ethers.utils.getAddress(fromAddress);
        const iface = new ethers.utils.Interface([
            'event Transfer(address indexed from, address indexed to, uint256 value)',
        ]);
        let total = ethers.BigNumber.from(0);
        for (const log of receipt.logs) {
            if (ethers.utils.getAddress(log.address) !== tokenAddr) {
                continue;
            }
            try {
                const ev = iface.parseLog(log);
                if (
                    ev.name === 'Transfer' &&
                    ethers.utils.getAddress(ev.args.from) === from &&
                    ev.args.to === ethers.constants.AddressZero
                ) {
                    total = total.add(ev.args.value);
                }
            } catch {
                /* not Transfer */
            }
        }
        if (total.isZero()) {
            throw new Error('No burn (Transfer to address(0)) from your wallet found in this transaction');
        }
        return { amountWei: total.toString() };
    }

    async mintNft(params: {
        toAddress: string;
        tokenUri: string;
        contractAddress: string;
    }): Promise<{ tokenId: string; transactionHash: string }> {
        if (!this.wallet) {
            throw new Error('Minting is not configured — set WALLET_PRIVATE_KEY in .env');
        }

        const abi = [
            'function mint(address to, string memory tokenURI) public returns (uint256)',
            'function safeMint(address to, string memory uri) public returns (uint256)',
        ];

        const contract = new ethers.Contract(params.contractAddress, abi, this.wallet);

        try {
            let tx: ethers.ContractTransaction;
            try {
                tx = await contract.safeMint(params.toAddress, params.tokenUri);
            } catch {
                tx = await contract.mint(params.toAddress, params.tokenUri);
            }

            const receipt = await tx.wait();
            const transferEvent = receipt.events?.find((e) => e.event === 'Transfer');
            const tokenId = transferEvent?.args?.tokenId?.toString() || '0';

            this.logger.log(`NFT minted — tx: ${receipt.transactionHash}, tokenId: ${tokenId}`);

            return {
                tokenId,
                transactionHash: receipt.transactionHash,
            };
        } catch (error) {
            this.logger.error(`Minting failed: ${error.message}`);
            throw error;
        }
    }

    async transferNft(params: {
        contractAddress: string;
        fromAddress: string;
        toAddress: string;
        tokenId: string;
    }): Promise<{ transactionHash: string }> {
        if (!this.wallet) {
            throw new Error('Transfer is not configured — set WALLET_PRIVATE_KEY in .env');
        }

        const abi = [
            'function safeTransferFrom(address from, address to, uint256 tokenId) public',
        ];

        const contract = new ethers.Contract(params.contractAddress, abi, this.wallet);

        const tx = await contract.safeTransferFrom(
            params.fromAddress,
            params.toAddress,
            params.tokenId,
        );

        const receipt = await tx.wait();
        this.logger.log(`NFT transferred — tx: ${receipt.transactionHash}`);

        return { transactionHash: receipt.transactionHash };
    }

    async getNftsForOwner(ownerAddress: string) {
        if (!this.alchemy) {
            throw new Error('Alchemy is not configured');
        }
        return this.alchemy.nft.getNftsForOwner(ownerAddress);
    }

    async getNftMetadata(contractAddress: string, tokenId: string) {
        if (!this.alchemy) {
            throw new Error('Alchemy is not configured');
        }
        return this.alchemy.nft.getNftMetadata(contractAddress, tokenId);
    }

    async verifyOwnership(ownerAddress: string, contractAddress: string, tokenId: string): Promise<boolean> {
        if (!this.alchemy) {
            throw new Error('Alchemy is not configured');
        }
        try {
            const nfts = await this.alchemy.nft.getNftsForOwner(ownerAddress, {
                contractAddresses: [contractAddress],
            });
            return nfts.ownedNfts.some((nft) => nft.tokenId === tokenId);
        } catch {
            return false;
        }
    }
}
