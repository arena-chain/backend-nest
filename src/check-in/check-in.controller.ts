import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';

@Controller('check-ins')
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) {}

    @Post()
    create(@Body() dto: CreateCheckInDto) {
        return this.checkInService.createForMatch(dto);
    }

    // POST /check-ins/:matchId/team/:teamId?team1Id=xxx
    @Post(':matchId/team/:teamId')
    checkIn(
        @Param('matchId') matchId: string,
        @Param('teamId') teamId: string,
        @Query('team1Id') team1Id: string,
    ) {
        return this.checkInService.checkIn(matchId, teamId, team1Id);
    }

    @Get('by-match/:matchId')
    findByMatch(@Param('matchId') matchId: string) {
        return this.checkInService.findByMatch(matchId);
    }

    @Get('by-season')
    findBySeason(@Query('seasonId') seasonId: string) {
        return this.checkInService.findBySeason(seasonId);
    }

    @Patch(':matchId/cancel')
    cancel(@Param('matchId') matchId: string) {
        return this.checkInService.cancel(matchId);
    }

    @Post('process-expired')
    processExpired() {
        return this.checkInService.processExpiredCheckIns();
    }
}
