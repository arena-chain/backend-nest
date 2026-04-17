import { PartialType } from '@nestjs/mapped-types';
import { CreateStandingsDto } from './create-standings.dto';

export class UpdateStandingsDto extends PartialType(CreateStandingsDto) { }
