// src/auth/dto/register.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

export class RegisterDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'SecurePassword123!',
        description: 'User password (minimum 6 characters)',
        minLength: 6,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({
        example: 'PlayerOne',
        description: 'User nickname',
    })
    @IsString()
    @IsNotEmpty()
    nickname: string;

    @ApiPropertyOptional({
        enum: UserRole,
        example: UserRole.PLAYER,
        description: 'User role (PLAYER, TEAM_MANAGER, REFEREE, or ADMIN)',
    })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;
}
