import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateTeamManagerDto {
    @ApiProperty({ required: false, description: 'Organization name' })
    @IsOptional()
    @IsString()
    organizationName?: string;

    @ApiProperty({ required: false, description: 'Managed team IDs', type: [String] })
    @IsOptional()
    @IsArray()
    managedTeams?: Types.ObjectId[];
}
