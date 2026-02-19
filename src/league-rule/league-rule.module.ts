import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeagueRule, LeagueRuleSchema } from './schemas/league-rule.schema';
import { LeagueRuleService } from './league-rule.service';
import { LeagueRuleController } from './league-rule.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: LeagueRule.name, schema: LeagueRuleSchema }])],
    controllers: [LeagueRuleController],
    providers: [LeagueRuleService],
    exports: [LeagueRuleService, MongooseModule],
})
export class LeagueRuleModule { }
