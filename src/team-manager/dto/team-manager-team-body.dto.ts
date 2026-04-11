import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/** Body for POST/PATCH team-manager/me/team (distinct name from team module CreateTeamDto for Swagger). */
export class TeamManagerTeamBodyDto {
    @ApiProperty({ description: 'Team name (must be unique)' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Organization name (auto-filled from profile if omitted)' })
    @IsOptional()
    @IsString()
    organizationName?: string;

    @ApiPropertyOptional({ description: 'Team logo — base64 string or URL' })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiPropertyOptional({ description: 'Team description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: ['amateur', 'pro'], default: 'amateur' })
    @IsOptional()
    @IsEnum(['amateur', 'pro'])
    type?: string;
}
