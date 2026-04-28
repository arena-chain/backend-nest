import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MintNftDto {
  @ApiProperty({ description: 'ID of the NFT to mint' })
  @IsString()
  @IsNotEmpty()
  nftId: string;

  @ApiProperty({
    description: 'Wallet address to mint the NFT to',
    example: '0x1234...',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
