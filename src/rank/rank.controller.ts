import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RankService } from './rank.service';
import { CreatePlayerRankDto } from './dto/create-rank.dto';
import { UpdateEloDto } from './dto/update-elo.dto';
import { ApplyPenaltyDto } from './dto/apply-penalty.dto';
import { TierName } from './schemas/rank-tier-config.schema';

@Controller('rank')
export class RankController {
  constructor(private readonly rankService: RankService) { }

  /**
   * Get general ranking configuration
   * GET /rank/config
   */
  @Get('config')
  async getGeneralConfig(@Query('gameId') gameId?: string) {
    return this.rankService.getGeneralConfig(gameId);
  }

  /**
   * Update general ranking configuration (Admin only)
   * POST /rank/config
   */
  @Post('config')
  async updateGeneralConfig(
    @Body() configData: any,
    @Query('gameId') gameId?: string
  ) {
    return this.rankService.updateGeneralConfig(configData, gameId);
  }

  /**
   * Get all tier configurations
   * GET /rank/tiers
   */
  @Get('tiers')
  async getTierConfigs(@Query('gameId') gameId?: string) {
    return this.rankService.getTierConfigs(gameId);
  }

  /**
   * Update a specific tier configuration (Admin only)
   * PATCH /rank/tiers/:tier
   */
  @Patch('tiers/:tier')
  async updateTierConfig(
    @Param('tier') tier: TierName,
    @Body() data: any,
    @Query('gameId') gameId?: string
  ) {
    return this.rankService.updateTierConfig(tier, data, gameId);
  }

  /**
   * Initialize a player rank for a game
   * POST /rank/initialize
   */
  @Post('initialize')
  async initializeRank(@Body() createPlayerRankDto: CreatePlayerRankDto) {
    return this.rankService.initializePlayerRank(createPlayerRankDto);
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
   * Get all ranks for the current authenticated user across all games
   * GET /rank/me/all
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me/all')
  async getMyRanks(@Req() req: any) {
    const userId = req.user?.userId;
    return this.rankService.getUserRanks(userId);
  }

  /**
   * Get all ranks for a specific user across all games
   * GET /rank/user/:userId/all
   */
  @Get('user/:userId/all')
  async getUserRanks(@Param('userId') userId: string) {
    return this.rankService.getUserRanks(userId);
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
   * Get a player's rank for a specific game
   * GET /rank/:userId/:gameId (DYNAMIC ROUTE - SHOULD BE AT BOTTOM)
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
   * Apply a penalty to a player (Admin only)
   * POST /rank/penalty
   */
  @Post('penalty')
  async applyPenalty(
    @Body() applyPenaltyDto: ApplyPenaltyDto,
  ) {
    const adminId = '000000000000000000000000'; // Placeholder
    return this.rankService.applyPenalty(applyPenaltyDto, adminId);
  }

  /**
   * Reset season ranks (Admin only)
   * POST /rank/reset-season/:gameId
   */
  @Post('reset-season/:gameId')
  async resetSeasonRanks(
    @Param('gameId') gameId: string,
    @Body('newSeason') newSeason: number,
  ) {
    return this.rankService.resetSeasonRanks(gameId, newSeason);
  }
}
