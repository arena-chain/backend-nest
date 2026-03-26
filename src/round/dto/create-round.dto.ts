import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { StageType } from '../../stage/schemas/stage.schema';

export class CreateRoundDto {
    @IsString()
    @IsNotEmpty()
    seasonId: string;

    @IsOptional()
    @IsString()
    stageId?: string;

    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    roundNumber: number;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;
}

export class GenerateRoundsDto {
    @IsString()
    @IsNotEmpty()
    seasonId: string;

    @IsOptional()
    @IsString()
    stageId?: string;

    /**
     * Optional. If not provided, derived from season startDate→endDate (one round per week).
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    weekCount?: number;

    /**
     * If true, also generates scheduled round-robin matches from registered teams.
     * Requires: season has rulesId, at least 2 ACTIVE teams registered.
     */
    @IsOptional()
    @IsBoolean()
    generateMatches?: boolean;

    /**
     * Stage format type: controls pairing algorithm.
     * LEAGUE / GROUPS → round-robin (default).
     * SWISS → pair teams by current W/L record (Dutch/Monrad system).
     */
    @IsOptional()
    @IsEnum(StageType)
    stageType?: StageType;

    /**
     * For Swiss: which round number is being generated (1, 2, 3…).
     * Required when stageType is SWISS and generateMatches is true.
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    swissRoundNumber?: number;
}
