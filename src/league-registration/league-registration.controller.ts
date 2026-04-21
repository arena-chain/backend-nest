import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LeagueRegistrationService } from './league-registration.service';
import { CreateLeagueRegistrationDto } from './dto/create-league-registration.dto';
import { UpdateLeagueRegistrationDto } from './dto/update-league-registration.dto';

@Controller('season-teams')
export class LeagueRegistrationController {
  constructor(private readonly service: LeagueRegistrationService) {}

  @Post()
  register(@Body() dto: CreateLeagueRegistrationDto) {
    return this.service.register(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('season/:seasonId')
  findBySeason(@Param('seasonId') seasonId: string) {
    return this.service.findBySeason(seasonId);
  }

  @Get('season/:seasonId/teams')
  getSeasonTeamsWithPlayers(@Param('seasonId') seasonId: string) {
    return this.service.getSeasonTeamsWithPlayers(seasonId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeagueRegistrationDto) {
    return this.service.updateStatus(id, dto);
  }

  @Patch(':id/withdraw')
  withdraw(@Param('id') id: string) {
    return this.service.withdraw(id);
  }

  @Patch(':id/disqualify')
  disqualify(@Param('id') id: string) {
    return this.service.disqualify(id);
  }
}
