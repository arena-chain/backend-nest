import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
}
