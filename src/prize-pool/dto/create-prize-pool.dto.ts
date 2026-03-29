import {
    IsString, IsNumber, IsEnum, IsOptional, IsArray,
    ValidateNested, Min, IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrizeCurrency, PrizeSource, PrizeStatus } from '../schemas/prize-pool.schema';

export class PrizeDistributionDto {
    @IsNumber()
    @Min(1)
    rank: number;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsNumber()
    @Min(0)
    percentage: number;
}

export class CreatePrizePoolDto {
    @IsString()
    seasonId: string;

    @IsString()
    leagueId: string;

    @IsNumber()
    @Min(0)
    totalAmount: number;

    @IsEnum(PrizeCurrency)
    currency: PrizeCurrency;

    @IsEnum(PrizeSource)
    source: PrizeSource;

    @IsOptional()
    @IsMongoId()
    sponsorId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PrizeDistributionDto)
    distribution: PrizeDistributionDto[];

    @IsOptional()
    @IsEnum(PrizeStatus)
    status?: PrizeStatus;

    @IsOptional()
    @IsString()
    notes?: string;
}
