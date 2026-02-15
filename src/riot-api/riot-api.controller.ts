import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RiotApiService } from './riot-api.service';
import { FetchAccountDto, RiotRegion } from './dto/fetch-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Riot API')
@Controller('riot-api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RiotApiController {
    constructor(private readonly riotApiService: RiotApiService) { }

    @Post('account')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Fetch League of Legends account information' })
    @ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Account not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Invalid API Key' })
    async fetchAccount(@Body() dto: FetchAccountDto) {
        return this.riotApiService.getPlayerAccount(dto);
    }

    @Get('match/:matchId')
    @ApiOperation({ summary: 'Get detailed match information' })
    getMatchDetail(
        @Param('matchId') matchId: string,
        @Query('region') region: RiotRegion,
        @Query('puuid') puuid: string,
    ) {
        return this.riotApiService.getDetailedMatchById(matchId, region, puuid);
    }

    @Post('tft/account')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Fetch TFT account information' })
    fetchTftAccount(@Body() dto: FetchAccountDto) {
        return this.riotApiService.getTftAccount(dto);
    }

    @Get('tft/match/:matchId')
    @ApiOperation({ summary: 'Get detailed TFT match information' })
    getTftMatchDetail(
        @Param('matchId') matchId: string,
        @Query('region') region: RiotRegion,
        @Query('puuid') puuid: string,
    ) {
        return this.riotApiService.getDetailedTftMatchInfo(matchId, region, puuid);
    }
}
