import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RankService } from './rank.service';
import { CreatePlayerRankDto } from './dto/create-rank.dto';
import { UpdateEloDto } from './dto/update-elo.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';

@Controller('rank')
export class RankController {
  constructor(private readonly rankService: RankService) { }

  /**
   * Initialize a player rank for a game
   * POST /rank/initialize
   */
  @Post('initialize')
  async initializeRank(@Body() createPlayerRankDto: CreatePlayerRankDto) {
    return this.rankService.initializePlayerRank(createPlayerRankDto);
  }

  /**
   * Get a player's rank for a specific game
   * GET /rank/:userId/:gameId
   */
  @Get(':userId/:gameId')
  async getPlayerRank(
    @Param('userId') userId: string,
    @Param('gameId') gameId: string,
  ) {
    return this.rankService.getPlayerRank(userId, gameId);
  }

  /**
   * Update ELO after a match
   * POST /rank/update-elo
   */
  @Post('update-elo')
  async updateElo(@Body() updateEloDto: UpdateEloDto) {
    return this.rankService.updateElo(updateEloDto);
  }

  /**
   * Apply a penalty to a player (Admin only - add auth guard later)
   * POST /rank/penalty
   */
  @Post('penalty')
  // @UseGuards(AdminGuard) // TODO: Add admin authentication guard
  async applyPenalty(
    @Body() applyPenaltyDto: ApplyPenaltyDto,
    // @CurrentUser() admin: any, // TODO: Get admin from auth context
  ) {
    // For now, using a placeholder admin ID - replace with real admin ID from auth
    const adminId = '000000000000000000000000'; // TODO: Replace with actual admin ID from request
    return this.rankService.applyPenalty(applyPenaltyDto, adminId);
  }

  /**
   * Get rank history for a player
   * GET /rank/history/:userId/:gameId
   */
  @Get('history/:userId/:gameId')
  async getRankHistory(
    @Param('userId') userId: string,
    @Param('gameId') gameId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.rankService.getRankHistory(userId, gameId, limitNum);
  }

  /**
   * Get leaderboard for a game
   * GET /rank/leaderboard/:gameId
   */
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

  /**
   * Get all ranks for a user across all games
   * GET /rank/user/:userId/all
   */
  @Get('user/:userId/all')
  async getUserRanks(@Param('userId') userId: string) {
    return this.rankService.getUserRanks(userId);
  }

  /**
   * Get user penalties
   * GET /rank/penalties/:userId
   */
  @Get('penalties/:userId')
  async getUserPenalties(
    @Param('userId') userId: string,
    @Query('gameId') gameId?: string,
  ) {
    return this.rankService.getUserPenalties(userId, gameId);
  }

  /**
   * Reset season ranks (Admin only)
   * POST /rank/reset-season/:gameId
   */
  @Post('reset-season/:gameId')
  // @UseGuards(AdminGuard) // TODO: Add admin authentication guard
  async resetSeasonRanks(
    @Param('gameId') gameId: string,
    @Body('newSeason') newSeason: number,
  ) {
    return this.rankService.resetSeasonRanks(gameId, newSeason);
  }
}
