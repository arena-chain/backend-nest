import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferNftItemDto {
  @ApiProperty({ description: 'ID of the NFT item to transfer' })
  @IsString()
  @IsNotEmpty()
  nftItemId: string;

  @ApiProperty({ description: 'User ID of the recipient' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty({
    description: 'Wallet address of the recipient',
    example: '0xabcd...',
  })
  @IsString()
  @IsNotEmpty()
  toWalletAddress: string;
}
