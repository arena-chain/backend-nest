import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScouterService } from './scouter.service';
import { UpdateScouterDto } from './dto/update-scouter.dto';

@ApiTags('scouter')
@Controller('scouter')
export class ScouterController {
  constructor(private readonly scouterService: ScouterService) {}

  @Get()
  @ApiOperation({ summary: 'Get all scouter profiles' })
  @ApiResponse({ status: 200, description: 'Return all scouters' })
  findAll() {
    return this.scouterService.findAll();
  }

  @Get('me/:userId')
  @ApiOperation({ summary: 'Get scouter profile by user ID' })
  @ApiResponse({ status: 200, description: 'Scouter profile found' })
  @ApiResponse({ status: 404, description: 'Scouter profile not found' })
  findByUserId(@Param('userId') userId: string) {
    return this.scouterService.findByUserId(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update scouter profile' })
  @ApiResponse({ status: 200, description: 'Scouter profile updated' })
  @ApiResponse({ status: 404, description: 'Scouter profile not found' })
  update(@Param('userId') userId: string, @Body() dto: UpdateScouterDto) {
    return this.scouterService.update(userId, dto);
  }

  // ─── Scouting endpoints: list players, view profiles, match history ────────

  @Get('players')
  @ApiOperation({ summary: 'List all players (for scouter dashboard)' })
  @ApiResponse({ status: 200, description: 'List of player profiles' })
  getPlayersList() {
    return this.scouterService.getPlayersList();
  }

  @Get('players/:playerUserId')
  @ApiOperation({ summary: 'Get player profile (consult player)' })
  @ApiResponse({ status: 200, description: 'Player profile' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  getPlayerProfile(@Param('playerUserId') playerUserId: string) {
    return this.scouterService.getPlayerProfile(playerUserId);
  }

  @Get('players/:playerUserId/matches')
  @ApiOperation({ summary: 'Get player match history' })
  @ApiResponse({
    status: 200,
    description: 'List of matches the player participated in',
  })
  getPlayerMatchHistory(@Param('playerUserId') playerUserId: string) {
    return this.scouterService.getPlayerMatchHistory(playerUserId);
  }

  @Get('players/:playerUserId/riot-matches')
  @ApiOperation({
    summary:
      "Get player's latest Riot LoL matches (linked+verified accounts only)",
  })
  @ApiResponse({
    status: 200,
    description:
      'Riot match history payload ({ linked, game, matches, total })',
  })
  getPlayerRiotMatchHistory(@Param('playerUserId') playerUserId: string) {
    return this.scouterService.getPlayerRiotMatchHistory(playerUserId, 8);
  }

  @Patch(':scouterUserId/scouted/:playerProfileId')
  @ApiOperation({ summary: 'Add player to scouter evaluated list' })
  @ApiResponse({ status: 200, description: 'Scouter profile updated' })
  addScoutedPlayer(
    @Param('scouterUserId') scouterUserId: string,
    @Param('playerProfileId') playerProfileId: string,
  ) {
    return this.scouterService.addScoutedPlayer(scouterUserId, playerProfileId);
  }
}
