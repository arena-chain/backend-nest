import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScouterLevel } from '../schemas/scouter-profile.schema';

export class CreateScouterDto {
  @ApiPropertyOptional({ enum: ScouterLevel, default: ScouterLevel.REGIONAL })
  @IsOptional()
  @IsEnum(ScouterLevel)
  level?: ScouterLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
