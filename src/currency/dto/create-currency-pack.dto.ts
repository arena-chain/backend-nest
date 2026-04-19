import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCurrencyPackDto {
    @ApiProperty({ example: 'Starter 500' })
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    title!: string;

    @ApiPropertyOptional({ example: 'Best value for new players' })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiProperty({ example: 500, description: 'Whole game tokens minted to the linked wallet on purchase' })
    @IsInt()
    @Min(1)
    @Max(100_000_000)
    grantWholeTokens!: number;

    @ApiProperty({ example: 499, description: 'Price in smallest currency unit (e.g. cents)' })
    @IsInt()
    @Min(0)
    @Max(100_000_000)
    priceCents!: number;

    @ApiPropertyOptional({ example: 'EUR' })
    @IsOptional()
    @IsString()
    @MaxLength(8)
    priceCurrency?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(1_000_000)
    sortOrder?: number;
}
