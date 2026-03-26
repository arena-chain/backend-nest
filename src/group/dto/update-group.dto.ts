import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

export class AddTeamToGroupDto {
    @IsString()
    teamId: string;
}

export class RemoveTeamFromGroupDto {
    @IsString()
    teamId: string;
}

export class BulkAssignTeamsDto {
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    teamIds: string[];
}
