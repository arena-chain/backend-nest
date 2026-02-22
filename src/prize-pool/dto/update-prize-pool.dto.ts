import { PartialType } from '@nestjs/mapped-types';
import { CreatePrizePoolDto } from './create-prize-pool.dto';

export class UpdatePrizePoolDto extends PartialType(CreatePrizePoolDto) {}
