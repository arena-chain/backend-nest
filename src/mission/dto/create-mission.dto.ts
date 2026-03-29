import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
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

    @IsNumber()
    @IsNotEmpty()
    reward: number;

    @ValidateNested()
    @Type(() => CreateMissionCriteriaDto)
    @IsNotEmpty()
    criteria: CreateMissionCriteriaDto;
}
