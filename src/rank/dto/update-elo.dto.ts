import { IsNotEmpty, IsMongoId, IsEnum, IsOptional } from 'class-validator';

export enum MatchResult {
    WIN = 'WIN',
    LOSS = 'LOSS',
}

export class UpdateEloDto {
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @IsNotEmpty()
    @IsMongoId()
    gameId: string;

    @IsNotEmpty()
    @IsEnum(MatchResult)
    result: MatchResult;

    @IsOptional()
    @IsMongoId()
    matchId?: string;

    @IsOptional()
    @IsMongoId()
    tournamentId?: string;

    @IsOptional()
    reasonDetails?: string;
}
