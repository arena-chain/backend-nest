import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TicketTypeDto } from './create-tournement.dto';

export class AddTicketTypesDto {
    @ApiProperty({
        description: 'List of ticket types to add/assign to the tournament',
        type: [TicketTypeDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TicketTypeDto)
    ticketTypes: TicketTypeDto[];
}
