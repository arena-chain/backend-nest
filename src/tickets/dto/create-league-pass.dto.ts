import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory } from '../schemas/ticket.schema';

export class CreateLeaguePassDto {
  @ApiProperty({ description: 'League ID' })
  @IsMongoId()
  leagueId: string;

  @ApiProperty({ enum: TicketCategory })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiPropertyOptional({ description: 'Display type name (e.g. VIP, NFT Pass)' })
  @IsOptional()
  @IsString()
  type?: string;
}
