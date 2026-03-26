import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SeasonTeamStatus } from '../schemas/season-team.schema';

export class CreateLeagueRegistrationDto {
    @IsString()
    @IsNotEmpty()
    seasonId: string;

    @IsString()
    @IsNotEmpty()
    teamId: string;

    @IsNumber()
    @Min(1)
    @IsOptional()
    seed?: number;

    @IsEnum(SeasonTeamStatus)
    @IsOptional()
    status?: SeasonTeamStatus;

    @IsString()
    @IsOptional()
    qualifiedFromSeasonId?: string;

    /** Human-readable qualification source, e.g. "DACH: Evolution Qualifier" */
    @IsString()
    @IsOptional()
    qualifiedFromName?: string;

    @IsNumber()
    @Min(1)
    @IsOptional()
    qualifiedViaRank?: number;
}
