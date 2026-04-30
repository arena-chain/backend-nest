import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { BracketFormat } from '../schemas/bracket.schema';

export class CreateBracketDto {
  @IsString()
  seasonId: string;

  @IsEnum(BracketFormat)
  format: BracketFormat;

  /** Bind this bracket to a specific stage */
  @IsOptional()
  @IsString()
  stageId?: string;

  /** If omitted, backend seeds from current season standings (by rank). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seededTeamIds?: string[];
}

export class AdvanceSlotDto {
  @IsString()
  slotId: string;

  @IsString()
  winnerId: string;

  /** Required for double elimination: the losing team goes to the lower bracket */
  @IsOptional()
  @IsString()
  loserId?: string;

  @IsOptional()
  @IsString()
  matchId?: string;
}
