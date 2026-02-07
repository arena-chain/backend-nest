import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamManagerDto {
    @ApiProperty({ required: false, description: 'Organization name' })
    @IsOptional()
    @IsString()
    organizationName?: string;
}
