import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({ description: 'Video title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Video URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Uploader User ID' })
  @IsMongoId()
  @IsNotEmpty()
  uploader: string;

  @ApiPropertyOptional({ description: 'Game/Catalog ID' })
  @IsMongoId()
  @IsOptional()
  game?: string;

  @ApiPropertyOptional({ description: 'Video duration in seconds' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    enum: ['public', 'private'],
    description: 'Show this upload on the channel page when public',
  })
  @IsOptional()
  @IsIn(['public', 'private'])
  channelVisibility?: 'public' | 'private';
}
