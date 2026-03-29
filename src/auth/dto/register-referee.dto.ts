// src/auth/dto/register-referee.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterRefereeDto extends RegisterDto {
    @ApiPropertyOptional({
        example: 'Senior',
        description: 'Referee level (e.g., Junior, Senior, Expert)',
    })
    @IsString()
    @IsOptional()
    level?: string;
}
