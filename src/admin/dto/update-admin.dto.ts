import { IsNumber, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdminDto {
    @ApiProperty({ required: false, description: 'Admin level' })
    @IsOptional()
    @IsNumber()
    adminLevel?: number;

    @ApiProperty({ required: false, description: 'Admin permissions', type: [String] })
    @IsOptional()
    @IsArray()
    permissions?: string[];
}
