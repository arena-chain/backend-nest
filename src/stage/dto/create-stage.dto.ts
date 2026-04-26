import {
    IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min, ValidateNested, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

import { StageType, StageStatus } from '../schemas/stage.schema';

export class SwissConfigDto {
    @IsNumber()
    @Min(1)
    roundsToWin: number;

    @IsNumber()
    @Min(1)
    roundsToEliminate: number;

    @IsNumber()
    @Min(1)
    maxRounds: number;
}

export class CreateStageDto {
    @IsOptional()
    @IsString()
    leagueId?: string;

    @IsString()
    seasonId: string;

    @IsString()
    name: string;

    @IsEnum(StageType)
    stageType: StageType;

    @IsNumber()
    @Min(0)
    @IsOptional()
    orderIndex?: number;

    @IsDateString()
    startAt: string;

    @IsDateString()
    endAt: string;

    @IsEnum(StageStatus)
    @IsOptional()
    status?: StageStatus;

    @IsString()
    rulesetId: string;

    @IsOptional()
    @IsString()
    bracketId?: string;

    @IsOptional()
    @IsString()
    standingsId?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    advancementCount?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    eliminationCount?: number;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => SwissConfigDto)
    swissConfig?: SwissConfigDto;

    @IsOptional()
    @IsString()
    description?: string;
}
