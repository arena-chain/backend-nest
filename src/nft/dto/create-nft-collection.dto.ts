import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNftCollectionDto {
  @ApiProperty({
    description: 'Collection name',
    example: 'Arena Warriors Avatars',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Exclusive avatar collection for Arena Chain warriors',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Collection cover image URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Collection category',
    enum: [
      'AVATARS',
      'WEAPONS',
      'SKINS',
      'CHARACTERS',
      'BADGES',
      'TROPHIES',
      'ARMOR',
      'ACCESSORIES',
      'MIXED',
    ],
    example: 'AVATARS',
  })
  @IsEnum([
    'AVATARS',
    'WEAPONS',
    'SKINS',
    'CHARACTERS',
    'BADGES',
    'TROPHIES',
    'ARMOR',
    'ACCESSORIES',
    'MIXED',
  ])
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'IDs of compatible games from the catalog',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  compatibleGames?: string[];

  @ApiPropertyOptional({
    description: 'Whether the collection is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Max supply for the entire collection (0 = unlimited)',
    example: 10000,
  })
  @IsNumber()
  @IsOptional()
  maxSupply?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
