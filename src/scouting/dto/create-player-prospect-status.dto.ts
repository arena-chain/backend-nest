import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ProspectLevel,
  ProspectPriority,
} from '../schemas/player-prospect-status.schema';

export class CreatePlayerProspectStatusDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsEnum(ProspectLevel)
  @IsOptional()
  prospectLevel?: ProspectLevel;

  @IsEnum(ProspectPriority)
  @IsOptional()
  priority?: ProspectPriority;
}
