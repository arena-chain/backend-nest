import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateStandingsDto {
  @IsString()
  @IsNotEmpty()
  seasonId: string;

  @IsString()
  @IsNotEmpty()
  teamId: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  played?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  wins?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  draws?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  losses?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;

  @IsNumber()
  @IsOptional()
  scoreFor?: number;

  @IsNumber()
  @IsOptional()
  scoreAgainst?: number;
}
