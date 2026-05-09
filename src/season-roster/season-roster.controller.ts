import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { SeasonRosterService } from './season-roster.service';
import {
  CreateSeasonRosterDto,
  AddPlayerDto,
  RemovePlayerDto,
} from './dto/create-season-roster.dto';

@Controller('season-rosters')
export class SeasonRosterController {
  constructor(private readonly rosterService: SeasonRosterService) {}

  @Post()
  create(@Body() dto: CreateSeasonRosterDto) {
    return this.rosterService.create(dto);
  }

  @Post(':seasonId/:teamId/players')
  addPlayer(
    @Param('seasonId') seasonId: string,
    @Param('teamId') teamId: string,
    @Body() body: AddPlayerDto,
  ) {
    return this.rosterService.addPlayer(seasonId, teamId, body.playerId);
  }

  @Delete(':seasonId/:teamId/players')
  removePlayer(
    @Param('seasonId') seasonId: string,
    @Param('teamId') teamId: string,
    @Body() body: RemovePlayerDto,
  ) {
    return this.rosterService.removePlayer(seasonId, teamId, body.playerId);
  }

  @Patch(':seasonId/:teamId/lock')
  lockRoster(
    @Param('seasonId') seasonId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.rosterService.lockRoster(seasonId, teamId);
  }

  @Patch(':seasonId/lock-all')
  lockAll(@Param('seasonId') seasonId: string) {
    return this.rosterService.lockAllForSeason(seasonId);
  }

  @Get('by-season')
  findBySeason(@Query('seasonId') seasonId: string) {
    return this.rosterService.findBySeason(seasonId);
  }

  @Get(':seasonId/:teamId')
  findOne(
    @Param('seasonId') seasonId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.rosterService.findByTeamAndSeason(seasonId, teamId);
  }
}
