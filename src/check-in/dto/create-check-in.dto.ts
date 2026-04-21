import { IsString, IsDateString } from 'class-validator';

export class CreateCheckInDto {
  @IsString()
  matchId: string;

  @IsString()
  seasonId: string;

  @IsDateString()
  deadline: string;
}
