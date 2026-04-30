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
import { TicketStatus, TicketCategory } from '../schemas/ticket.schema';

export class CreateTicketDto {
  @ApiProperty({ description: 'League ID' })
  @IsMongoId()
  @IsOptional()
  league?: string;

  @ApiPropertyOptional({ description: 'Tournament ID' })
  @IsMongoId()
  @IsOptional()
  tournament?: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsMongoId()
  @IsOptional()
  user?: string;

  @ApiProperty({ description: 'Ticket Category', enum: TicketCategory })
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @ApiProperty({ description: 'Ticket Type name (e.g. VIP, Standard)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Quantity of tickets', default: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Ticket Status',
    enum: TicketStatus,
    default: TicketStatus.VALID,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;
}
