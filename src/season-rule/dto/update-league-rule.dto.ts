import { PartialType } from '@nestjs/mapped-types';
import { CreateLeagueRuleDto } from './create-league-rule.dto';

export class UpdateLeagueRuleDto extends PartialType(CreateLeagueRuleDto) { }
