import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDate,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCatalogDto {
  @ApiProperty({
    description: 'The title of the game',
    example: 'League of Legends',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Brief description of the game',
    example: 'A 5v5 team-based strategy game',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Game genre',
    example: 'MOBA',
    enum: [
      'MOBA',
      'FPS',
      'Battle Royale',
      'Strategy',
      'Sports',
      'RPG',
      'Fighting',
    ],
  })
  @IsString()
  @IsNotEmpty()
  genre: string;

  @ApiPropertyOptional({
    description: 'Game publisher',
    example: 'Riot Games',
  })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiPropertyOptional({
    description: 'Supported platforms',
    example: ['PC', 'PlayStation 5', 'Xbox Series X'],
    type: [String],
  })
  @Transform(({ value }) => {
    // Handle multipart/form-data: convert string or single value to array
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Try to parse as JSON array first
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value ? [value] : [];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platforms?: string[];

  @ApiPropertyOptional({
    description: 'Whether the game is active in the catalog',
    example: true,
    default: true,
  })
  @Transform(({ value }) => {
    // Handle multipart/form-data: convert string to boolean
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Game release date',
    example: '2009-10-27',
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  releaseDate?: Date;

  @ApiPropertyOptional({
    description: 'Cover image URL (auto-populated from file upload)',
    example: '/uploads/league-of-legends-1234.jpg',
  })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as key-value pairs',
    example: { gameEngine: 'Unreal Engine 4', maxPlayers: 10 },
  })
  @Transform(({ value }) => {
    // Handle multipart/form-data: parse JSON string to object
    if (typeof value === 'object' && value !== null) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return {};
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
