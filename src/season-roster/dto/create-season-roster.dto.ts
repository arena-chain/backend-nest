import {
    IsString, IsOptional, IsArray, IsNumber, Min, IsEnum,
} from 'class-validator';
import { RosterStatus } from '../schemas/season-roster.schema';

export class CreateSeasonRosterDto {
    @IsString()
    seasonId: string;

    @IsString()
    teamId: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    playerIds?: string[];

    @IsOptional()
    @IsNumber()
    @Min(1)
    minRosterSize?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxRosterSize?: number;
}

export class AddPlayerDto {
    @IsString()
    playerId: string;
}

export class RemovePlayerDto {
    @IsString()
    playerId: string;
}
