import { Injectable, ForbiddenException } from '@nestjs/common';
import { ethers } from 'ethers';

type AdminUser = { id: string; role: 'ADMIN' | 'PLAYER' };
type Tournament = { id: string; name: string; startsAt: string };

@Injectable()
export class TicketsNftService {
    private readonly provider = new ethers.providers.JsonRpcProvider(
        process.env.POLYGON_AMOY_RPC_URL || '',
    );
    private readonly wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY || '', this.provider);
    private readonly contract = new ethers.Contract(
        process.env.TICKET_NFT_CONTRACT_ADDRESS || '',
        [
            'function mintTicket(address to,string metadataURI,string tournamentId,string tournamentName,uint64 eventDate,string ticketType) external returns (uint256)',
            'event TicketMinted(uint256 indexed tokenId,address indexed to,string tournamentId,string ticketType,string metadataURI)'
        ],
        this.wallet
    );

    private async buildMetadataUri(tournament: Tournament, ticketType: string): Promise<string> {
        // Replace with your IPFS upload service or metadata endpoint.
        return `https://api.arenachain.app/metadata/${tournament.id}/${ticketType}/${Date.now()}.json`;
    }

    async mintBatch(
        admin: AdminUser,
        tournament: Tournament,
        quantity: number,
        ticketType: 'STANDARD' | 'VIP NFT',
        recipients?: string[]
    ) {
        if (admin.role !== 'ADMIN') {
            throw new ForbiddenException('Only admin can mint NFT tickets');
        }

        const total = Math.max(1, Math.floor(Number(quantity) || 1));
        const eventDate = Math.floor(new Date(tournament.startsAt).getTime() / 1000);
        const output: Array<{ tokenId: string; txHash: string; recipient: string }> = [];

        for (let i = 0; i < total; i++) {
            const recipient = recipients?.[i] || this.wallet.address;
            const metadataURI = await this.buildMetadataUri(tournament, ticketType);
            const tx = await this.contract.mintTicket(
                recipient,
                metadataURI,
                tournament.id,
                tournament.name,
                eventDate,
                ticketType
            );
            const receipt = await tx.wait();
            const parsed = receipt?.logs
                ?.map((log: any) => {
                    try {
                        return this.contract.interface.parseLog(log);
                    } catch {
                        return null;
                    }
                })
                .find((e: any) => e?.name === 'TicketMinted');

            output.push({
                tokenId: parsed?.args?.tokenId?.toString() || '',
                txHash: receipt?.transactionHash || '',
                recipient
            });
        }

        return output;
    }
}
