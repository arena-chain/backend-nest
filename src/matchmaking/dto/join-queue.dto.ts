import { IsString, IsOptional, IsDateString } from 'class-validator';

export class JoinQueueDto {
    @IsString()
    game: string;

    @IsString()
    mode: string;

    @IsString()
    region: string;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;
}
