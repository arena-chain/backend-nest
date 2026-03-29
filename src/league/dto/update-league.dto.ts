<<<<<<< HEAD
import { PartialType } from '@nestjs/swagger';
=======
import { PartialType } from '@nestjs/mapped-types';
>>>>>>> origin/live_stream
import { CreateLeagueDto } from './create-league.dto';

export class UpdateLeagueDto extends PartialType(CreateLeagueDto) { }
