import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { BracketService } from './bracket.service';
import { CreateBracketDto, AdvanceSlotDto } from './dto/create-bracket.dto';

@Controller('brackets')
export class BracketController {
    constructor(private readonly bracketService: BracketService) {}

    /** GET /brackets?seasonId=xxx — same as GET /brackets/by-season?seasonId=xxx */
    @Get()
    findByIdOrSeason(@Query('seasonId') seasonId: string) {
        if (!seasonId) {
            return null;
        }
        return this.bracketService.findBySeason(seasonId);
    }

    @Post('generate')
    generate(@Body() dto: CreateBracketDto) {
        return this.bracketService.generate(dto);
    }

    @Patch(':seasonId/advance')
    advanceWinner(
        @Param('seasonId') seasonId: string,
        @Body() dto: AdvanceSlotDto,
    ) {
        return this.bracketService.advanceWinner(seasonId, dto);
    }

    @Get('by-season')
    findBySeason(@Query('seasonId') seasonId: string) {
        return this.bracketService.findBySeason(seasonId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.bracketService.findOne(id);
    }

    @Delete(':seasonId')
    delete(@Param('seasonId') seasonId: string) {
        return this.bracketService.delete(seasonId);
    }
}
