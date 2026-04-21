// src/auth/dto/register-team-manager.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterTeamManagerDto extends RegisterDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'CIN (ID number)' })
  @IsString()
  @IsOptional()
  cin?: string;

  @ApiPropertyOptional({ description: 'Age' })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ description: 'Gender' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Description/Bio' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'Elite Gaming Organization',
    description: 'Name of the organization the team manager represents',
  })
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiPropertyOptional({ description: 'The ID of the team to manage' })
  @IsString()
  teamId: string;
}
