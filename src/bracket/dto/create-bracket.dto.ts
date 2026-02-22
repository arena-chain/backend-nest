import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { BracketFormat } from '../schemas/bracket.schema';

export class CreateBracketDto {
    @IsString()
    seasonId: string;

    @IsEnum(BracketFormat)
    format: BracketFormat;

    /** If omitted, backend seeds from current season standings (by rank). */
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    seededTeamIds?: string[];
}

export class AdvanceSlotDto {
    @IsString()
    slotId: string;

    @IsString()
    winnerId: string;

    @IsOptional()
    @IsString()
    matchId?: string;
}
