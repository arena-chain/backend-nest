// src/auth/dto/register-admin.dto.ts
import { IsNumber, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterAdminDto extends RegisterDto {
    @ApiPropertyOptional({
        example: 2,
        description: 'Admin level (1-5, higher means more privileges)',
    })
    @IsNumber()
    @IsOptional()
    adminLevel?: number;

    @ApiPropertyOptional({
        example: ['manage_users', 'manage_content', 'manage_tournaments'],
        description: 'Array of permission strings',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];
}
