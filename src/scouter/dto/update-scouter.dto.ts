import { PartialType } from '@nestjs/mapped-types';
import { CreateScouterDto } from './create-scouter.dto';

export class UpdateScouterDto extends PartialType(CreateScouterDto) {}
