import { PartialType } from '@nestjs/mapped-types';
import { CreatePlayerRankDto } from './create-rank.dto';

export class UpdateRankDto extends PartialType(CreatePlayerRankDto) { }
