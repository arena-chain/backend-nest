import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { FormatType, MatchFormat, TiebreakerRule } from '../schemas/league-rule.schema';

export class CreateLeagueRuleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    gameId: string;

    @IsEnum(FormatType)
    @IsOptional()
    formatType?: FormatType;

    @IsEnum(MatchFormat)
    @IsOptional()
    matchType?: MatchFormat;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pointsWin?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pointsLoss?: number;

    @IsNumber()
    @Min(2)
    @IsOptional()
    maxTeams?: number;

    @IsNumber()
    @Min(1)
    @IsOptional()
    maxForfeitsBeforeDisqualification?: number;

    @IsBoolean()
    @IsOptional()
    forfeitCountsAsLoss?: boolean;

    @IsEnum(TiebreakerRule)
    @IsOptional()
    tiebreaker?: TiebreakerRule;

    @IsObject()
    @IsOptional()
    extraRules?: Record<string, any>;
}
