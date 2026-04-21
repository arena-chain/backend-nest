import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { ProspectPriority } from '../schemas/player-prospect-status.schema';

export class CreateWatchlistDto {
  @IsMongoId()
  @IsNotEmpty()
  scouterId: string;

  @IsMongoId()
  playerId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ProspectPriority)
  priority?: ProspectPriority;
}
