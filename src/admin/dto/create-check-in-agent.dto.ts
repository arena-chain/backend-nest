import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCheckInAgentDto {
  @ApiProperty({ example: 'checkin.agent@arena.test' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Gate Agent 01' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: 'StrongPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'EUROPE' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'TUNISIA' })
  @IsOptional()
  @IsString()
  country?: string;
}
