import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    weekCount: number;
}
