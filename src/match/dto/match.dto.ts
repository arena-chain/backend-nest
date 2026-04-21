import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchFormat } from '../../season-rule/schemas/season-rule.schema';

export class CreateMatchDto {
  @IsString()
  @IsNotEmpty()
  roundId: string;

  @IsString()
  @IsNotEmpty()
  seasonId: string;

  @IsString()
  @IsNotEmpty()
  team1Id: string;

  @IsString()
  @IsNotEmpty()
  team2Id: string;

  // format is NOT sent by the client — auto-set from LeagueRule via Season.rulesId

  @IsDateString()
  @IsNotEmpty()
  scheduledStart: string;

  @IsDateString()
  @IsOptional()
  scheduledEnd?: string;

  @IsString()
  @IsOptional()
  refereeId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(MatchFormat)
  @IsOptional()
  formatOverride?: MatchFormat;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  streamUrl?: string;
}

export class AddGameResultDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  gameNumber: number;

  @IsString()
  @IsNotEmpty()
  winnerId: string;

  @IsString()
  @IsOptional()
  mapName?: string;

  @IsNumber()
  @IsOptional()
  team1Score?: number;

  @IsNumber()
  @IsOptional()
  team2Score?: number;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;
}

export class SubmitFullResultDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  team1GamesWon: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  team2GamesWon: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddGameResultDto)
  games?: AddGameResultDto[];
}

export class DeclareForfeitDto {
  @IsString()
  @IsNotEmpty()
  forfeitingTeamId: string;

  @IsString()
  @IsOptional()
  forfeitReason?: string;
}
