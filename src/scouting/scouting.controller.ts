import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ScoutingService } from './scouting.service';
import { CreateScoutingReportDto } from './dto/create-scouting-report.dto';
import { CreatePlayerProspectStatusDto } from './dto/create-player-prospect-status.dto';
import { CreatePlayerRecommendationDto } from './dto/create-player-recommendation.dto';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateScoutingReportDto } from './dto/update-scouting-report.dto';
import { UpdatePlayerProspectStatusDto } from './dto/update-player-prospect-status.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import {
  ProspectLevel,
  ProspectPriority,
} from './schemas/player-prospect-status.schema';
import { RecommendationStatus } from './schemas/player-recommendation.schema';

@Controller('scouting')
export class ScoutingController {
  constructor(private readonly scoutingService: ScoutingService) {}

  // ─── ScoutingReport ─────────────────────────────────────────────────────────

  @Post('reports')
  createReport(@Body() dto: CreateScoutingReportDto) {
    return this.scoutingService.createReport(dto, dto.scouterId);
  }

  @Get('reports/scouter/:scouterId')
  findReportsByScouter(
    @Param('scouterId') scouterId: string,
    @Query('playerId') playerId?: string,
  ) {
    return this.scoutingService.findReportsByScouter(scouterId, playerId);
  }

  @Get('reports/player/:playerId')
  findReportsByPlayer(@Param('playerId') playerId: string) {
    return this.scoutingService.findReportsByPlayer(playerId);
  }

  @Get('reports/:id')
  findReportById(@Param('id') id: string) {
    return this.scoutingService.findReportById(id);
  }

  @Patch('reports/:id')
  updateReport(@Param('id') id: string, @Body() dto: UpdateScoutingReportDto) {
    return this.scoutingService.updateReport(id, dto);
  }

  @Delete('reports/:id')
  deleteReport(@Param('id') id: string) {
    return this.scoutingService.deleteReport(id);
  }

  // ─── PlayerProspectStatus ──────────────────────────────────────────────────

  @Post('prospects')
  createOrUpdateProspectStatus(@Body() dto: CreatePlayerProspectStatusDto) {
    return this.scoutingService.createOrUpdateProspectStatus(dto);
  }

  @Get('prospects/player/:playerId')
  findProspectByPlayer(@Param('playerId') playerId: string) {
    return this.scoutingService.findProspectStatusByPlayer(playerId);
  }

  @Get('prospects')
  findProspectsByLevel(
    @Query('prospectLevel') prospectLevel?: ProspectLevel,
    @Query('priority') priority?: ProspectPriority,
  ) {
    return this.scoutingService.findProspectsByLevel(prospectLevel, priority);
  }

  @Patch('prospects/player/:playerId')
  updateProspectStatus(
    @Param('playerId') playerId: string,
    @Body() dto: UpdatePlayerProspectStatusDto,
  ) {
    return this.scoutingService.updateProspectStatus(playerId, dto);
  }

  // ─── PlayerRecommendation ───────────────────────────────────────────────────

  @Post('recommendations')
  createRecommendation(@Body() dto: CreatePlayerRecommendationDto) {
    return this.scoutingService.createRecommendation(dto, dto.scouterId);
  }

  @Get('recommendations/scouter/:scouterId')
  findRecommendationsByScouter(@Param('scouterId') scouterId: string) {
    return this.scoutingService.findRecommendationsByScouter(scouterId);
  }

  @Get('recommendations/player/:playerId')
  findRecommendationsByPlayer(@Param('playerId') playerId: string) {
    return this.scoutingService.findRecommendationsByPlayer(playerId);
  }

  @Get('recommendations/organization/:organizationId')
  findRecommendationsByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('status') status?: RecommendationStatus,
  ) {
    return this.scoutingService.findRecommendationsByOrganization(
      organizationId,
      status,
    );
  }

  @Patch('recommendations/:id/status')
  updateRecommendationStatus(
    @Param('id') id: string,
    @Body('status') status: RecommendationStatus,
  ) {
    return this.scoutingService.updateRecommendationStatus(id, status);
  }

  // ─── Watchlist ─────────────────────────────────────────────────────────────

  @Post('watchlist')
  addToWatchlist(@Body() dto: CreateWatchlistDto) {
    return this.scoutingService.addToWatchlist(dto.scouterId, dto);
  }

  @Get('watchlist/scouter/:scouterId')
  getWatchlistByScouter(@Param('scouterId') scouterId: string) {
    return this.scoutingService.getWatchlistByScouter(scouterId);
  }

  @Get('watchlist/player/:playerId')
  getWatchlistByPlayer(@Param('playerId') playerId: string) {
    return this.scoutingService.getWatchlistByPlayer(playerId);
  }

  @Get('watchlist/check')
  isPlayerInWatchlist(
    @Query('scouterId') scouterId: string,
    @Query('playerId') playerId: string,
  ) {
    return this.scoutingService.isPlayerInWatchlist(scouterId, playerId);
  }

  @Patch('watchlist/:id')
  updateWatchlistEntry(
    @Param('id') id: string,
    @Body('scouterId') scouterId: string,
    @Body() dto: UpdateWatchlistDto,
  ) {
    return this.scoutingService.updateWatchlistEntry(id, scouterId, dto);
  }

  @Delete('watchlist/scouter/:scouterId/player/:playerId')
  removeFromWatchlist(
    @Param('scouterId') scouterId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.scoutingService.removeFromWatchlist(scouterId, playerId);
  }

  // ─── Filtered players ──────────────────────────────────────────────────────

  @Get('players/filter')
  getFilteredPlayers(
    @Query('gameId') gameId?: string,
    @Query('tier') tier?: string,
    @Query('country') country?: string,
    @Query('hasTeam') hasTeam?: string,
    @Query('prospectLevel') prospectLevel?: ProspectLevel,
    @Query('priority') priority?: ProspectPriority,
  ) {
    const hasTeamBool =
      hasTeam === 'true' ? true : hasTeam === 'false' ? false : undefined;
    return this.scoutingService.getFilteredPlayers({
      gameId,
      tier,
      country,
      hasTeam: hasTeamBool,
      prospectLevel,
      priority,
    });
  }
}
