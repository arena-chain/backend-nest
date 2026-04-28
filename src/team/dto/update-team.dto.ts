import { PartialType } from '@nestjs/swagger';
import { CreateTeamDto } from './create-team.dto';
import { IsMongoId, IsOptional, IsArray } from 'class-validator';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @IsOptional()
  @IsMongoId()
  teamManagerId?: string;

  @IsOptional()
  @IsArray()
  members?: string[];
}
