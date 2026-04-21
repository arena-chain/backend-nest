import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BundleDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateTicketTypeDefinitionDto {
  @ApiProperty({
    description: 'Name of the ticket type',
    example: 'VIP Access',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Price of the ticket', example: 100 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Total capacity for this ticket type',
    example: 50,
  })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ description: 'Description of perks' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [BundleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleDto)
  @IsOptional()
  bundles?: BundleDto[];
}
