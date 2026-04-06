import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { PrizePoolService } from './prize-pool.service';
import { CreatePrizePoolDto } from './dto/create-prize-pool.dto';
import { UpdatePrizePoolDto } from './dto/update-prize-pool.dto';

@Controller('prize-pools')
export class PrizePoolController {
    constructor(private readonly prizePoolService: PrizePoolService) {}

    @Post()
    create(@Body() dto: CreatePrizePoolDto) {
        return this.prizePoolService.create(dto);
    }

    @Get()
    findAll() {
        return this.prizePoolService.findAll();
    }

    @Get('by-season')
    findBySeason(@Query('seasonId') seasonId: string) {
        return this.prizePoolService.findBySeason(seasonId);
    }

    @Get('by-league')
    findByLeague(@Query('leagueId') leagueId: string) {
        return this.prizePoolService.findByLeague(leagueId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.prizePoolService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePrizePoolDto) {
        return this.prizePoolService.update(id, dto);
    }

    @Patch(':id/distribute')
    markDistributed(@Param('id') id: string) {
        return this.prizePoolService.markDistributed(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.prizePoolService.remove(id);
    }
}
