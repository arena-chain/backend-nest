import { IsBoolean, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlayerDto {
    @ApiProperty({ required: false, description: 'Is this a professional player' })
    @IsOptional()
    @IsBoolean()
    isPro?: boolean;

    @ApiProperty({ required: false, description: 'Is the player verified' })
    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @ApiProperty({ required: false, description: 'Player ELO rating' })
    @IsOptional()
    @IsNumber()
    elo?: number;

    @ApiProperty({ required: false, description: 'Player rank' })
    @IsOptional()
    @IsString()
    rank?: string;

    @ApiProperty({ required: false, description: 'Player stats object' })
    @IsOptional()
    @IsObject()
    stats?: Record<string, any>;
}
