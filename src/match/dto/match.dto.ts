import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMatchDto {
    @IsString()
    @IsNotEmpty()
    roundId: string;

    @IsString()
    @IsNotEmpty()
    seasonId: string;

    @IsString()
    @IsNotEmpty()
    team1Id: string;

    @IsString()
    @IsNotEmpty()
    team2Id: string;

    // format is NOT sent by the client — auto-set from LeagueRule via Season.rulesId

    @IsDateString()
    @IsNotEmpty()
    scheduledStart: string;

    @IsDateString()
    @IsOptional()
    scheduledEnd?: string;

    @IsString()
    @IsOptional()
    refereeId?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class AddGameResultDto {
    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    gameNumber: number;

    @IsString()
    @IsNotEmpty()
    winnerId: string;

    @IsNumber()
    @IsOptional()
    durationMinutes?: number;
}

export class SubmitFullResultDto {
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    team1GamesWon: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    team2GamesWon: number;
}

export class DeclareForfeitDto {
    @IsString()
    @IsNotEmpty()
    forfeitingTeamId: string;

    @IsString()
    @IsOptional()
    forfeitReason?: string;
}
