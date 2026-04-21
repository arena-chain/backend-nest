import { PartialType } from '@nestjs/swagger';
import { CreateLeagueRegistrationDto } from './create-league-registration.dto';

export class UpdateLeagueRegistrationDto extends PartialType(
  CreateLeagueRegistrationDto,
) {}
