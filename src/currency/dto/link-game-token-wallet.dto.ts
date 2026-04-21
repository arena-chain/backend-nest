import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Link the signed-in player’s inventory to an external EOA (e.g. MetaMask). Server checksums the address. */
export class LinkGameTokenWalletDto {
  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description:
      'Checksummed or any-valid 0x + 40 hex; normalized server-side with ethers.getAddress.',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'walletAddress must be a 0x-prefixed 40-character hex address',
  })
  walletAddress!: string;
}
