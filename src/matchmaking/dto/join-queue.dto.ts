import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RiotAccountInfoDto {
  @IsNumber()
  originalIconId: number;

  @IsString()
  riotGameName: string;

  @IsString()
  riotLinkStatus: string;

  @IsString()
  riotPuuid: string;

  @IsString()
  riotRegion: string;

  @IsString()
  riotTagLine: string;
}

export class JoinQueueDto {
  @IsString()
  game: string;

  @IsString()
  mode: string;

  @IsString()
  server: string;

  @IsString()
  region: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RiotAccountInfoDto)
  riotAccountInfo?: RiotAccountInfoDto;

  @IsOptional()
  @IsString()
  partyId?: string;
}
