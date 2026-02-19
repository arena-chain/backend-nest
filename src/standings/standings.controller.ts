import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { StandingsService } from './standings.service';

@Controller('standings')
export class StandingsController {
    constructor(private readonly standingsService: StandingsService) {}

    @Get()
    findBySeason(@Query('seasonId') seasonId: string) {
        return this.standingsService.findBySeason(seasonId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.standingsService.findOne(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.standingsService.remove(id);
    }
}
