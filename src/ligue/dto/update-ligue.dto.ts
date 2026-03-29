import { PartialType } from '@nestjs/swagger';
import { CreateLigueDto } from './create-ligue.dto';

export class UpdateLigueDto extends PartialType(CreateLigueDto) {}
