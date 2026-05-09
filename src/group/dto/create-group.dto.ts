import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  seasonId: string;

  @IsString()
  @IsNotEmpty()
  stageId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  groupIndex?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamIds?: string[];

  @IsNumber()
  @Min(1)
  @IsOptional()
  advancementCount?: number;
}
