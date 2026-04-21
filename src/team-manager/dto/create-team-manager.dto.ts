import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamManagerDto {
  @ApiProperty({ required: false, description: 'Organization name' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({ description: 'The ID of the team to manage' })
  @IsString()
  teamId: string;
}
