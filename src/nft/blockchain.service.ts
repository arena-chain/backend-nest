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

@Injectable()
export class BlockchainService implements OnModuleInit {
    private readonly logger = new Logger(BlockchainService.name);
    private alchemy: Alchemy | undefined;
    private wallet: ethers.Wallet | null = null;
    /** Used for ethers.Contract reads (GTK) and for signing when WALLET_PRIVATE_KEY is set. */
    private jsonRpcProvider: ethers.providers.JsonRpcProvider | null = null;
    private gameTokenContractAddress: string | null = null;

    constructor(private configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>('ALCHEMY_API_KEY');
        const network = this.configService.get<string>('ALCHEMY_NETWORK') || 'eth-sepolia';
        const rpcUrlFallback = this.configService.get<string>('RPC_URL')?.trim();

        this.gameTokenContractAddress =
            this.configService.get<string>('GAME_TOKEN_CONTRACT_ADDRESS')?.trim() || null;

        const networkMap: Record<string, Network> = {
            'eth-mainnet': Network.ETH_MAINNET,
            'eth-sepolia': Network.ETH_SEPOLIA,
            'polygon-mainnet': Network.MATIC_MAINNET,
            'polygon-mumbai': Network.MATIC_MUMBAI,
        };

        if (apiKey) {
            this.alchemy = new Alchemy({
                apiKey,
                network: networkMap[network] || Network.ETH_SEPOLIA,
            });
            const alchemyUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`;
            this.jsonRpcProvider = new ethers.providers.JsonRpcProvider(alchemyUrl);
            this.logger.log(`Alchemy SDK initialized on network: ${network}`);
        } else {
            this.logger.warn('ALCHEMY_API_KEY not set — Alchemy / NFT helpers will be disabled');
            if (rpcUrlFallback) {
                this.jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcUrlFallback);
                this.logger.log('Using RPC_URL for on-chain reads (e.g. GTK balance)');
            }
        }

        const privateKey = this.configService.get<string>('WALLET_PRIVATE_KEY');
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

    getGameTokenContractAddress(): string | null {
        return this.gameTokenContractAddress;
    }

    async getGameTokenMetadata(): Promise<{
        contractAddress: string;
        name: string;
        symbol: string;
        decimals: number;
        /** EVM chain id (e.g. 31337 for Anvil, 137 for Polygon) — use in the wallet / UI network switcher. */
        chainId: number;
    } | null> {
        if (!this.isGameTokenConfigured()) {
            return null;
        }
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
        return {
            contractAddress: ethers.utils.getAddress(this.gameTokenContractAddress!),
            name,
            symbol,
            decimals: Number(decimals),
            chainId: network.chainId,
        };
    }

    async getGameTokenBalance(holderAddress: string): Promise<{
        balanceRaw: string;
        balanceFormatted: string;
        symbol: string;
        decimals: number;
        chainId: number;
    }> {
        if (!this.isGameTokenConfigured()) {
            throw new Error('Game token (GTK) is not configured — set GAME_TOKEN_CONTRACT_ADDRESS and RPC');
        }
        if (!ethers.utils.isAddress(holderAddress)) {
            throw new Error('Invalid wallet address');
        }
        const checksum = ethers.utils.getAddress(holderAddress);
        const contract = new ethers.Contract(
            this.gameTokenContractAddress!,
            ERC20_ABI,
            this.jsonRpcProvider!,
        );
        const [raw, symbol, decimals, network] = await Promise.all([
            contract.balanceOf(checksum),
            contract.symbol(),
            contract.decimals(),
            this.jsonRpcProvider!.getNetwork(),
        ]);
        const decimalsNum = Number(decimals);
        return {
            balanceRaw: raw.toString(),
            balanceFormatted: ethers.utils.formatUnits(raw, decimalsNum),
            symbol,
            decimals: decimalsNum,
            chainId: network.chainId,
        };
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
