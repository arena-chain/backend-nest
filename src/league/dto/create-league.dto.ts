import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LeagueMode, LeagueTier, RegionFilter } from '../schemas/league.schema';

export class CreateLeagueDto {
  @ApiProperty({ example: 'Winter Championship 2026' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name: string;

  @ApiProperty({ example: 'game_id_123' })
  @IsString({ message: "L'ID du jeu doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'ID du jeu est obligatoire" })
  gameId: string;

  @ApiPropertyOptional({ example: 'https://arena-chain.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Season 1 of the official arena league' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: LeagueTier, default: LeagueTier.OFFICIAL })
  @IsEnum(LeagueTier, { message: 'Type de ligue invalide' })
  @IsOptional()
  tier?: LeagueTier;

  @ApiProperty({ enum: LeagueMode, default: LeagueMode.SOLO })
  @IsEnum(LeagueMode, { message: 'Mode de ligue invalide' })
  @IsOptional()
  mode?: LeagueMode;

  @ApiProperty({ enum: RegionFilter, default: RegionFilter.GLOBAL })
  @IsEnum(RegionFilter, { message: 'Filtre de région invalide' })
  @IsOptional()
  regionFilter?: RegionFilter;

  @ApiProperty({ example: 'Europe' })
  @IsString({ message: 'La valeur de région doit être une chaîne' })
  @IsOptional()
  regionValue?: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'La date de début est obligatoire' })
  startDate: Date;

  @ApiProperty()
  @IsNotEmpty({ message: 'La date de fin est obligatoire' })
  endDate: Date;

  @ApiProperty({ default: 100 })
  @IsInt({ message: 'Le nombre de participants doit être un entier' })
  @Min(2, { message: 'Il faut au moins 2 participants' })
  @IsOptional()
  maxParticipants?: number;

  @ApiProperty({ default: 0 })
  @IsInt({ message: "L'ELO minimum doit être un entier" })
  @Min(0, { message: "L'ELO ne peut pas être négatif" })
  @IsOptional()
  minElo?: number;

  @ApiPropertyOptional({ description: 'Custom ticket types for this league' })
  @IsOptional()
  ticketTypes?: any[];
}
