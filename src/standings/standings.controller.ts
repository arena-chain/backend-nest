import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { StandingsService } from './standings.service';

@Controller('standings')
export class StandingsController {
    constructor(private readonly standingsService: StandingsService) {}

    @Get()
    findBySeason(
        @Query('seasonId') seasonId: string,
        @Query('stageId') stageId?: string,
        @Query('groupId') groupId?: string,
    ) {
        return this.standingsService.findBySeason(seasonId, stageId, groupId);
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
