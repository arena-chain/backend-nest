import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ProspectPriority } from '../schemas/player-prospect-status.schema';

export class UpdateWatchlistDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ProspectPriority)
  priority?: ProspectPriority;
}
