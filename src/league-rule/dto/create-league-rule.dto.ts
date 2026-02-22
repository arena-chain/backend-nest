import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
    FormatType,
    MapVetoFormat,
    MatchFormat,
    OvertimeFormat,
    RuleUsage,
    ScoreSubmissionMethod,
    SideSelection,
    TiebreakerRule,
    VetoFirstPick,
} from '../schemas/league-rule.schema';

export class OvertimeConfigDto {
    @IsEnum(OvertimeFormat)
    @IsOptional()
    format?: OvertimeFormat;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsNumber()
    @Min(1)
    @IsOptional()
    maxRoundsPerPeriod?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    startMoney?: number;

    @IsBoolean()
    @IsOptional()
    allowDrawIfDisabled?: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    maxOvertimePeriods?: number;
}

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

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    mapPool?: string[];

    @IsBoolean()
    @IsOptional()
    mapVetoEnabled?: boolean;

    @IsEnum(MapVetoFormat)
    @IsOptional()
    mapVetoFormat?: MapVetoFormat;

    @IsEnum(VetoFirstPick)
    @IsOptional()
    vetoFirstPick?: VetoFirstPick;

    @IsArray()
    @IsEnum(RuleUsage, { each: true })
    @IsOptional()
    ruleUsage?: RuleUsage[];

    @IsEnum(SideSelection)
    @IsOptional()
    sideSelection?: SideSelection;

    @IsEnum(ScoreSubmissionMethod)
    @IsOptional()
    scoreSubmissionMethod?: ScoreSubmissionMethod;

    @IsBoolean()
    @IsOptional()
    substitutionsAllowed?: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    maxSubstitutions?: number;

    @IsBoolean()
    @IsOptional()
    emergencySubsOnly?: boolean;

    @IsBoolean()
    @IsOptional()
    pauseAllowedForDisconnect?: boolean;

    @IsString()
    @IsOptional()
    replayConditions?: string;

    @IsString()
    @IsOptional()
    remakeConditions?: string;

    @IsBoolean()
    @IsOptional()
    adminDecisionRequired?: boolean;

    @ValidateNested()
    @Type(() => OvertimeConfigDto)
    @IsOptional()
    overtimeConfig?: OvertimeConfigDto;

    @IsObject()
    @IsOptional()
    extraRules?: Record<string, any>;
}
