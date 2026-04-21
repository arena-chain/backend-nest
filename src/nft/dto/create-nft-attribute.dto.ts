import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNftAttributeDto {
  @ApiProperty({ description: 'ID of the NFT this attribute belongs to' })
  @IsString()
  @IsNotEmpty()
  nftId: string;

  @ApiProperty({
    description: 'Trait type (e.g. Damage, Speed, Element)',
    example: 'Damage',
  })
  @IsString()
  @IsNotEmpty()
  traitType: string;

  @ApiProperty({ description: 'Value of the trait', example: '150' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    description: 'Display type for marketplaces',
    example: 'number',
  })
  @IsString()
  @IsOptional()
  displayType?: string;

  @ApiPropertyOptional({
    description: 'Numeric value if applicable',
    example: 150,
  })
  @IsNumber()
  @IsOptional()
  numericValue?: number;

  @ApiPropertyOptional({
    description: 'Max value for progress bars',
    example: 500,
  })
  @IsNumber()
  @IsOptional()
  maxValue?: number;
}
