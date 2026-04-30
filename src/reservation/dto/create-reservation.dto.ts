import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsMongoId,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ description: 'League ID' })
  @IsMongoId()
  @IsNotEmpty()
  league: string;

  @ApiProperty({ description: 'User ID' })
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @ApiProperty({ description: 'Ticket Type name (e.g. VIP)' })
  @IsString()
  @IsNotEmpty()
  ticketType: string;

  @ApiProperty({ description: 'Quantity of tickets', default: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
