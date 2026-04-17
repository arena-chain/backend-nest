import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Alchemy, Network, NftTokenType } from 'alchemy-sdk';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService implements OnModuleInit {
    private readonly logger = new Logger(BlockchainService.name);
    private alchemy: Alchemy;
    private wallet: ethers.Wallet | null = null;
    private provider: ethers.providers.JsonRpcProvider | null = null;

    constructor(private configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>('ALCHEMY_API_KEY');
        const network = this.configService.get<string>('ALCHEMY_NETWORK') || 'eth-sepolia';

        if (!apiKey) {
            this.logger.warn('ALCHEMY_API_KEY not set — blockchain features will be disabled');
            return;
        }

        const networkMap: Record<string, Network> = {
            'eth-mainnet': Network.ETH_MAINNET,
            'eth-sepolia': Network.ETH_SEPOLIA,
            'polygon-mainnet': Network.MATIC_MAINNET,
            'polygon-mumbai': Network.MATIC_MUMBAI,
        };

        this.alchemy = new Alchemy({
            apiKey,
            network: networkMap[network] || Network.ETH_SEPOLIA,
        });

        const privateKey = this.configService.get<string>('WALLET_PRIVATE_KEY');
        if (privateKey) {
            const alchemyUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`;
            this.provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
            this.wallet = new ethers.Wallet(privateKey, this.provider as ethers.providers.Provider);
            this.logger.log(`Blockchain wallet configured: ${this.wallet.address}`);
        } else {
            this.logger.warn('WALLET_PRIVATE_KEY not set — minting will be disabled');
        }

        this.logger.log(`Alchemy SDK initialized on network: ${network}`);
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
