import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MatchService } from './match.service';
import {
    AddGameResultDto,
    CreateMatchDto,
    DeclareForfeitDto,
    SubmitFullResultDto,
} from './dto/match.dto';

@Controller('matches')
export class MatchController {
    constructor(private readonly matchService: MatchService) {}

    @Post()
    create(@Body() dto: CreateMatchDto) {
        return this.matchService.create(dto);
    }

    @Get()
    findAll(@Query('roundId') roundId?: string, @Query('seasonId') seasonId?: string) {
        if (roundId) return this.matchService.findByRound(roundId);
        if (seasonId) return this.matchService.findBySeason(seasonId);
        return [];
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.matchService.findOne(id);
    }

    @Post(':id/game')
    addGameResult(@Param('id') id: string, @Body() dto: AddGameResultDto) {
        return this.matchService.addGameResult(id, dto);
    }

    @Patch(':id/result')
    submitFullResult(@Param('id') id: string, @Body() dto: SubmitFullResultDto) {
        return this.matchService.submitFullResult(id, dto);
    }

    @Patch(':id/forfeit')
    declareForfeit(@Param('id') id: string, @Body() dto: DeclareForfeitDto) {
        return this.matchService.declareForfeit(id, dto);
    }

    @Patch(':id/cancel')
    cancel(@Param('id') id: string) {
        return this.matchService.cancel(id);
    }
}
