import { PartialType } from '@nestjs/swagger';
import { TeamManagerTeamBodyDto } from './team-manager-team-body.dto';

/** PATCH team-manager/me/team — all fields optional. */
export class TeamManagerTeamUpdateDto extends PartialType(
  TeamManagerTeamBodyDto,
) {}
