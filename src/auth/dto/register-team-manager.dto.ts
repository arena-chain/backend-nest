// src/auth/dto/register-team-manager.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterTeamManagerDto extends RegisterDto {
    @ApiPropertyOptional({
        example: 'Elite Gaming Organization',
        description: 'Name of the organization the team manager represents',
    })
    @IsString()
    @IsOptional()
    organizationName?: string;
}
