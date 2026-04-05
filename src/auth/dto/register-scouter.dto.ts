import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';
import { ScouterLevel } from '../../scouter/schemas/scouter-profile.schema';

export class RegisterScouterDto extends RegisterDto {
  @ApiPropertyOptional({ enum: ScouterLevel, default: ScouterLevel.REGIONAL })
  @IsOptional()
  @IsEnum(ScouterLevel)
  level?: ScouterLevel;

  @ApiPropertyOptional({ description: 'Internal notes about scouting activity' })
  @IsOptional()
  @IsString()
  notes?: string;
}
