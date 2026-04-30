import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HighlightVisibility } from '../schemas/highlight.schema';

export class CreateHighlightDto {
  @ApiProperty({ description: 'Highlight title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Highlight description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Video ID' })
  @IsMongoId()
  @IsNotEmpty()
  video: string;

  @ApiProperty({ description: 'Start time in seconds' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  startTime: number;

  @ApiProperty({ description: 'End time in seconds' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  endTime: number;

  @ApiProperty({ description: 'Creator User ID' })
  @IsMongoId()
  @IsNotEmpty()
  creator: string;

  @ApiPropertyOptional({
    description: 'Clip file path or URL (required for manual create)',
  })
  @IsString()
  @IsOptional()
  clipUrl?: string;

  @ApiPropertyOptional({ enum: HighlightVisibility, default: 'private' })
  @IsEnum(HighlightVisibility)
  @IsOptional()
  visibility?: HighlightVisibility;
}
