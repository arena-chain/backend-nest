import {
    IsString, IsEnum, IsArray, IsOptional, IsUrl,
} from 'class-validator';
import { DisputeReason } from '../schemas/match-dispute.schema';

export class CreateMatchDisputeDto {
    @IsString()
    matchId: string;

    @IsString()
    seasonId: string;

    @IsString()
    submittedByTeamId: string;

    @IsEnum(DisputeReason)
    reason: DisputeReason;

    @IsString()
    description: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    evidenceUrls?: string[];
}

export class ResolveDisputeDto {
    @IsEnum(['ACCEPTED', 'REJECTED'])
    verdict: 'ACCEPTED' | 'REJECTED';

    @IsString()
    adminNote: string;

    @IsString()
    resolvedByAdminId: string;
}
