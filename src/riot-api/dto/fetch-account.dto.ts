import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RiotRegion {
    NA1 = 'na1',
    EUW1 = 'euw1',
    EUN1 = 'eun1',
    KR = 'kr',
    BR1 = 'br1',
    JP1 = 'jp1',
    LA1 = 'la1',
    LA2 = 'la2',
    OC1 = 'oc1',
    TR1 = 'tr1',
    RU = 'ru',
}

// Mapping for account API (uses different routing values)
export const REGION_TO_ROUTING: Record<RiotRegion, string> = {
    [RiotRegion.NA1]: 'americas',
    [RiotRegion.BR1]: 'americas',
    [RiotRegion.LA1]: 'americas',
    [RiotRegion.LA2]: 'americas',
    [RiotRegion.EUW1]: 'europe',
    [RiotRegion.EUN1]: 'europe',
    [RiotRegion.TR1]: 'europe',
    [RiotRegion.RU]: 'europe',
    [RiotRegion.KR]: 'asia',
    [RiotRegion.JP1]: 'asia',
    [RiotRegion.OC1]: 'sea',
};

export const REGION_TO_MATCH_ROUTING: Record<string, string> = {
    [RiotRegion.NA1]: 'americas',
    [RiotRegion.BR1]: 'americas',
    [RiotRegion.LA1]: 'americas', // LAN
    [RiotRegion.LA2]: 'americas', // LAS
    [RiotRegion.EUW1]: 'europe',
    [RiotRegion.EUN1]: 'europe', // EUNE
    [RiotRegion.TR1]: 'europe', // TR
    [RiotRegion.RU]: 'europe',
    [RiotRegion.KR]: 'asia',
    [RiotRegion.JP1]: 'asia', // JP
    [RiotRegion.OC1]: 'sea', // OC
};

export class FetchAccountDto {
    @ApiProperty({ description: 'In-game name (without tag)', example: 'Faker' })
    @IsString()
    gameName: string;

    @ApiProperty({ description: 'Tag line (without #)', example: 'KR1' })
    @IsString()
    tagLine: string;

    @ApiProperty({
        description: 'Server region',
        enum: RiotRegion,
        example: RiotRegion.KR
    })
    @IsEnum(RiotRegion)
    region: RiotRegion;
}
