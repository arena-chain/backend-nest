import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeasonRule, SeasonRuleSchema } from './schemas/season-rule.schema';
import { LeagueRuleService } from './season-rule.service';
import { LeagueRuleController } from './season-rule.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: SeasonRule.name, schema: SeasonRuleSchema }])],
    controllers: [LeagueRuleController],
    providers: [LeagueRuleService],
    exports: [LeagueRuleService, MongooseModule],
})
export class LeagueRuleModule { }
