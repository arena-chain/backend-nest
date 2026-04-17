import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateScoutingReportDto {
  @IsMongoId()
  @IsNotEmpty()
  scouterId: string;

  @IsMongoId()
  @IsNotEmpty()
  playerId: string;

  @IsString()
  @IsOptional()
  matchId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  rating: number;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  weaknesses?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  recommendedRole?: string;
}
