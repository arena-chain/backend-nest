import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseListingDto {
  @ApiProperty({ description: 'Listed NFT item id' })
  @IsString()
  @IsNotEmpty()
  nftItemId: string;
}
