import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LeagueRuleService } from './league-rule.service';
import { CreateLeagueRuleDto } from './dto/create-league-rule.dto';
import { UpdateLeagueRuleDto } from './dto/update-league-rule.dto';

@Controller('league-rules')
export class LeagueRuleController {
    constructor(private readonly leagueRuleService: LeagueRuleService) {}

    @Post()
    create(@Body() dto: CreateLeagueRuleDto) {
        return this.leagueRuleService.create(dto);
    }

    @Get()
    findAll(@Query('gameId') gameId?: string) {
        if (gameId) return this.leagueRuleService.findByGame(gameId);
        return this.leagueRuleService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leagueRuleService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateLeagueRuleDto) {
        return this.leagueRuleService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.leagueRuleService.remove(id);
    }
}
