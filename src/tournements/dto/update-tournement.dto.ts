import { PartialType } from '@nestjs/swagger';
import { CreateTournementDto } from './create-tournement.dto';

export class UpdateTournementDto extends PartialType(CreateTournementDto) {}
