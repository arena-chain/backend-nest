import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RiotRegion } from './fetch-account.dto';

export class LinkAccountDto {
    @ApiProperty({ description: 'In-game name (without tag)', example: 'Faker' })
    @IsString()
    gameName: string;

    @ApiProperty({ description: 'Tag line (without #)', example: 'KR1' })
    @IsString()
    tagLine: string;

    @ApiProperty({
        description: 'Server region',
        enum: RiotRegion,
        example: RiotRegion.KR,
    })
    @IsEnum(RiotRegion)
    region: RiotRegion;
}
