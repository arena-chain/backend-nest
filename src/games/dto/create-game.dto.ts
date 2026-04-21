import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class CreateGameDto {
  @IsMongoId()
  game_id: string;

  @IsString()
  match_type: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  scheduled_at: Date;

  @IsNumber()
  @IsOptional()
  number_of_participant?: number;
}
