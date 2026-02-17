import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '../schemas/ticket.schema';

export class CreateTicketDto {
    @ApiProperty({ description: 'Tournament ID' })
    @IsMongoId()
    @IsNotEmpty()
    tournament: string;

    @ApiProperty({ description: 'User ID' })
    @IsMongoId()
    @IsNotEmpty()
    user: string;

    @ApiProperty({ description: 'Ticket Type name (e.g. VIP)' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ description: 'Quantity of tickets', default: 1 })
    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    quantity: number;

    @ApiPropertyOptional({ description: 'Ticket Status', enum: TicketStatus, default: TicketStatus.VALID })
    @IsEnum(TicketStatus)
    @IsOptional()
    status?: TicketStatus;
}
