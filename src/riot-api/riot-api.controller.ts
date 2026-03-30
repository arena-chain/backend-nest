import { Controller, Post, Get, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RiotApiService } from './riot-api.service';
import { FetchAccountDto, RiotRegion } from './dto/fetch-account.dto';
import { LinkAccountDto } from './dto/link-account.dto';
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

    @Get('match-history')
    @ApiOperation({ summary: 'Get match history for the logged-in user\'s linked Riot account' })
    @ApiResponse({ status: 200, description: 'Match history retrieved' })
    getMatchHistory(
        @Req() req: any,
        @Query('game') game: 'lol' | 'val' | 'all' = 'all',
        @Query('start') start: string = '0',
        @Query('count') count: string = '10',
    ) {
        return this.riotApiService.getMatchHistory(
            req.user.userId,
            game || 'all',
            parseInt(start, 10) || 0,
            Math.min(parseInt(count, 10) || 10, 20),
        );
    }

    // ── Account Linking ───────────────────────────────────────────────────

    @Post('link-account')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Initiate Riot account linking (captures current icon)' })
    @ApiResponse({ status: 200, description: 'Link initiated — change your icon then verify' })
    @ApiResponse({ status: 404, description: 'Riot account not found' })
    linkAccount(@Req() req: any, @Body() dto: LinkAccountDto) {
        return this.riotApiService.linkAccount(req.user.userId, dto);
    }

    @Post('verify-account')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify Riot account ownership by icon change' })
    @ApiResponse({ status: 200, description: 'Verification result' })
    @ApiResponse({ status: 400, description: 'No pending link found' })
    verifyAccount(@Req() req: any) {
        return this.riotApiService.verifyAccount(req.user.userId);
    }

    @Get('link-status')
    @ApiOperation({ summary: 'Get current Riot account link status' })
    @ApiResponse({ status: 200, description: 'Current link status' })
    getLinkStatus(@Req() req: any) {
        return this.riotApiService.getLinkStatus(req.user.userId);
    }

    @Post('disconnect-account')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disconnect linked Riot account' })
    @ApiResponse({ status: 200, description: 'Account disconnected successfully' })
    disconnectAccount(@Req() req: any) {
        return this.riotApiService.disconnectAccount(req.user.userId);
    }
}
