import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RankService } from './rank.service';
import { CreatePlayerRankDto } from './dto/create-rank.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';

@Controller('rank')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Post('initialize')
  async initializeRank(@Body() createPlayerRankDto: CreatePlayerRankDto) {
    return this.rankService.initializePlayerRank(createPlayerRankDto);
  }

  @Get('leaderboard/:gameId')
  async getLeaderboard(
    @Param('gameId') gameId: string,
    @Query('season') season?: string,
    @Query('limit') limit?: string,
  ) {
    const seasonNum = season ? parseInt(season, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.rankService.getLeaderboard(gameId, seasonNum, limitNum);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/all')
  async getMyRanks(@Req() req: any) {
    const userId = req.user?.userId;
    return this.rankService.getUserRanks(userId);
  }

  @Get('user/:userId/all')
  async getUserRanks(@Param('userId') userId: string) {
    return this.rankService.getUserRanks(userId);
  }

  @Get('history/:userId/:gameId')
  async getRankHistory(
    @Param('userId') userId: string,
    @Param('gameId') gameId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.rankService.getRankHistory(userId, gameId, limitNum);
  }

  @Get('penalties/:userId')
  async getUserPenalties(
    @Param('userId') userId: string,
    @Query('gameId') gameId?: string,
  ) {
    return this.rankService.getUserPenalties(userId, gameId);
  }

  @Get(':userId/:gameId')
  async getPlayerRank(
    @Param('userId') userId: string,
    @Param('gameId') gameId: string,
  ) {
    return this.rankService.getPlayerRank(userId, gameId);
  }

  @Post('penalty')
  async applyPenalty(@Body() applyPenaltyDto: ApplyPenaltyDto) {
    const adminId = '000000000000000000000000';
    return this.rankService.applyPenalty(applyPenaltyDto, adminId);
  }

  @Post('reset-season/:gameId')
  async resetSeasonRanks(
    @Param('gameId') gameId: string,
    @Body('newSeason') newSeason: number,
  ) {
    return this.rankService.resetSeasonRanks(gameId, newSeason);
  }
}
