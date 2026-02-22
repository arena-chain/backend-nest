import {
    IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min,
} from 'class-validator';
import { StageType, StageStatus } from '../schemas/stage.schema';

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

    @IsOptional()
    @IsString()
    description?: string;
}
