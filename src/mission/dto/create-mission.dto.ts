import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateMissionCriteriaDto {
    @IsString()
    @IsNotEmpty()
    type: string;

    @IsNumber()
    @IsNotEmpty()
    target: number;
}

export class CreateMissionDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(['daily', 'weekly', 'special'])
    @IsNotEmpty()
    type: string;

    @IsEnum(['individual', 'friends'])
    @IsOptional()
    scope?: string;

    @IsEnum(['lol', 'valorant', 'all'])
    @IsOptional()
    game?: string;

    @ValidateNested()
    @Type(() => CreateMissionCriteriaDto)
    @IsNotEmpty()
    criteria: CreateMissionCriteriaDto;

    @IsEnum(['xp', 'tokens', 'nft'])
    @IsOptional()
    rewardType?: string;

    @IsNumber()
    @IsNotEmpty()
    rewardAmount: number;

    @IsString()
    @IsOptional()
    iconColor?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsNumber()
    @IsOptional()
    sortOrder?: number;
}
