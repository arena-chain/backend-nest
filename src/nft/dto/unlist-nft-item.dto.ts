import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnlistNftItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    nftItemId: string;
}
