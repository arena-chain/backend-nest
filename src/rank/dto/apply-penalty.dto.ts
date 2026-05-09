import {
  IsNotEmpty,
  IsMongoId,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
} from 'class-validator';
import { PenaltyType, PenaltySeverity } from '../schemas/penalty.schema';

export class ApplyPenaltyDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsMongoId()
  gameId: string;

  @IsNotEmpty()
  @IsEnum(PenaltyType)
  type: PenaltyType;

  @IsNotEmpty()
  @IsEnum(PenaltySeverity)
  severity: PenaltySeverity;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  eloDeduction: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];

  @IsOptional()
  @IsMongoId()
  matchId?: string;

  @IsOptional()
  @IsMongoId()
  tournamentId?: string;

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  includesRankReset?: boolean;
}
