import { PartialType } from '@nestjs/mapped-types';
import { CreateScoutingReportDto } from './create-scouting-report.dto';

export class UpdateScoutingReportDto extends PartialType(
  CreateScoutingReportDto,
) {}
