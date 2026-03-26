import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EquipItemDto {
    @ApiProperty({ description: 'ID of the NFT item to equip' })
    @IsString()
    @IsNotEmpty()
    nftItemId: string;

    @ApiProperty({ description: 'Equipment slot (e.g. weapon, head, body, accessory)', example: 'weapon' })
    @IsString()
    @IsNotEmpty()
    slot: string;
}
