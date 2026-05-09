import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  IsArray,
  IsObject,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateLigueDto {
  @ApiProperty({
    description: 'The name of the ligue',
    example: 'Pro League Summer 2024',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the ligue',
    example: 'The biggest summer tournament for pros.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID of the organizer (User)',
    example: '60d5ec49f1b2c8b1f8e4e1a1',
  })
  @IsMongoId()
  @IsNotEmpty()
  organizerId: string;

  @ApiPropertyOptional({
    description: 'List of team IDs participating',
    example: ['60d5ec49f1b2c8b1f8e4e1a2', '60d5ec49f1b2c8b1f8e4e1a3'],
    type: [String],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  teams?: string[];

  @ApiPropertyOptional({
    description: 'Prize pool amount',
    example: 10000,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  prizePool?: number;

  @ApiPropertyOptional({
    description: 'Start date of the ligue',
    example: '2024-06-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date of the ligue',
    example: '2024-08-31',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Status of the ligue',
    example: 'upcoming',
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Rules and regulations',
    example: { format: 'Round Robin', mapPool: ['Map1', 'Map2'] },
  })
  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;
}
