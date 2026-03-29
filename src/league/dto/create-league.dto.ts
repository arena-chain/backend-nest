import { IsEnum, IsNotEmpty, IsString, IsOptional, IsBoolean, IsMongoId, Validate } from 'class-validator';
import { LeagueLevel } from '../schemas/league.schema';
import { IsValidRegionConstraint } from './is-valid-region.decorator';

export class CreateLeagueDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(LeagueLevel)
    @IsNotEmpty()
    level: LeagueLevel;

    @Validate(IsValidRegionConstraint)
    @IsString()
    @IsOptional()
    regionId: string;

    @IsString()
    @IsNotEmpty()
    gameId: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsMongoId()
    @IsOptional()
    organiserId?: string;
}
