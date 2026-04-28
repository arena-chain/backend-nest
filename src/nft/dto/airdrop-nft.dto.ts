import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AirdropNftDto {
  @ApiProperty({ description: 'ID of the NFT to airdrop' })
  @IsString()
  @IsNotEmpty()
  nftId: string;

  @ApiProperty({ description: 'User ID of the recipient' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiPropertyOptional({ description: 'Wallet address of the recipient' })
  @IsString()
  @IsOptional()
  walletAddress?: string;
}
