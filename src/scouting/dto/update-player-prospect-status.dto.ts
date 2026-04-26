import { IsEnum, IsOptional } from 'class-validator';
import { ProspectLevel, ProspectPriority } from '../schemas/player-prospect-status.schema';

export class UpdatePlayerProspectStatusDto {
  @IsEnum(ProspectLevel)
  @IsOptional()
  prospectLevel?: ProspectLevel;

  @IsEnum(ProspectPriority)
  @IsOptional()
  priority?: ProspectPriority;
}
