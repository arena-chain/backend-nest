// src/auth/dto/register-player.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterPlayerDto extends RegisterDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Whether the player is a professional player',
  })
  @IsBoolean()
  @IsOptional()
  isPro?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the player is verified',
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
