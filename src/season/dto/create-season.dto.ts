import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SeasonStatus } from '../schemas/season.schema';

export class CreateSeasonDto {
  @IsString()
  @IsNotEmpty()
  leagueId: string;

  @IsOptional()
  @IsString()
  rulesId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsDateString()
  @IsNotEmpty()
  registrationDeadline: string;

  @IsEnum(SeasonStatus)
  @IsOptional()
  status?: SeasonStatus;

  @IsString()
  @IsOptional()
  description?: string;
}
