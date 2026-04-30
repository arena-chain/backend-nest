import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GameProfileStatsDto,
  PlayerGameProfileService,
} from './services/player-game-profile.service';

@ApiTags('player')
@Controller('player')
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly playerGameProfileService: PlayerGameProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all player profiles' })
  @ApiResponse({ status: 200, description: 'Return all player profiles' })
  findAll() {
    return this.playerService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a player profile' })
  @ApiResponse({
    status: 201,
    description: 'Player profile created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(
    @Body() createPlayerDto: CreatePlayerDto,
    @Body('userId') userId: string,
  ) {
    return this.playerService.create(
      new Types.ObjectId(userId),
      createPlayerDto,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Current user player profile (creates default if missing)',
  })
  @ApiResponse({ status: 200, description: 'Player profile' })
  getMe(@Request() req: { user: { userId: string } }) {
    return this.playerService.findOrCreateByUserId(req.user.userId);
  }

  @Get('game-profile/:gameId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getGameProfile(
    @Request() req: { user: { userId: string } },
    @Param('gameId') gameId: string,
  ): Promise<{ profile: GameProfileStatsDto | null }> {
    return this.playerGameProfileService
      .getProfile(req.user.userId, gameId)
      .then((profile) => ({ profile }));
  }

  @Get('game-profiles/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getAllGameProfiles(
    @Request() req: { user: { userId: string } },
  ): Promise<{ profiles: GameProfileStatsDto[] }> {
    const profiles = await this.playerGameProfileService.getUserAllProfiles(
      req.user.userId,
    );
    return { profiles };
  }

  @Get('game/:gameId/recent-matches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getRecentMatches(
    @Request() req: { user: { userId: string } },
    @Param('gameId') gameId: string,
    @Query('limit') limit?: string,
  ): Promise<{ matches: any[] }> {
    const parsedLimit = parseInt(limit || '10', 10) || 10;
    const matches = await this.playerGameProfileService.getUserRecentMatches(
      req.user.userId,
      gameId,
      parsedLimit,
    );
    return { matches };
  }

  @Get('leaderboard/:gameId')
  async getLeaderboard(
    @Param('gameId') gameId: string,
    @Query('limit') limit?: string,
  ): Promise<{ leaderboard: GameProfileStatsDto[] }> {
    const parsedLimit = parseInt(limit || '100', 10) || 100;
    const leaderboard = await this.playerGameProfileService.getLeaderboard(
      gameId,
      parsedLimit,
    );
    return { leaderboard };
  }

  @Get('game-cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getGameCards(
    @Request() req: { user: { userId: string } },
  ): Promise<{ cards: any[] }> {
    const profiles = await this.playerGameProfileService.getUserAllProfiles(
      req.user.userId,
    );
    const cards = await Promise.all(
      profiles.map(async (profile) => {
        const recentMatches =
          await this.playerGameProfileService.getUserRecentMatches(
            req.user.userId,
            profile.gameId,
            3,
          );
        return {
          gameId: profile.gameId,
          rank: profile.rank,
          elo: profile.elo,
          peakElo: profile.peakElo,
          rankedWins: profile.rankedWins,
          rankedLosses: profile.rankedLosses,
          customWins: profile.customWins,
          customLosses: profile.customLosses,
          totalGames: profile.gamesPlayed,
          xp: profile.xp,
          missionLevel: profile.missionLevel,
          linkStatus: profile.linkStatus,
          lastPlayedAt: profile.lastPlayedAt,
          recentMatches,
        };
      }),
    );
    return { cards };
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get player profile by user ID' })
  @ApiResponse({ status: 200, description: 'Player profile found' })
  @ApiResponse({ status: 404, description: 'Player profile not found' })
  findByUserId(@Param('userId') userId: string) {
    return this.playerService.findByUserId(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update player profile' })
  @ApiResponse({
    status: 200,
    description: 'Player profile updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Player profile not found' })
  update(
    @Param('userId') userId: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
  ) {
    return this.playerService.update(userId, updatePlayerDto);
  }
}
