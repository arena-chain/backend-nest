import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeagueService } from './league.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('leagues')
@Controller('leagues')
@ApiBearerAuth('JWT-auth')
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new league (Admin only)' })
  create(@Body() createLeagueDto: CreateLeagueDto, @Req() req) {
    // Note: In a real app, check req.user.role here
    return this.leagueService.create(createLeagueDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leagues' })
  findAll(@Query() query: any) {
    return this.leagueService.findAll(query);
  }

  @Get('my-registrations')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get leagues current player is registered for' })
  getMyLeagues(@Req() req) {
    return this.leagueService.findMyLeagues(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get league details' })
  findOne(@Param('id') id: string) {
    return this.leagueService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update league (Admin only)' })
  update(@Param('id') id: string, @Body() updateLeagueDto: UpdateLeagueDto) {
    return this.leagueService.update(id, updateLeagueDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete league (Admin only)' })
  delete(@Param('id') id: string) {
    return this.leagueService.delete(id);
  }

  @Post(':id/register')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Register current player for a league' })
  register(@Param('id') id: string, @Req() req) {
    return this.leagueService.registerParticipant(id, req.user.userId);
  }

  @Get(':id/standings')
  @ApiOperation({ summary: 'Get league standings' })
  getStandings(@Param('id') id: string) {
    return this.leagueService.getStandings(id);
  }

  @Post(':id/distribute-rewards')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Distribute rewards for a finished league (Admin only)',
  })
  distributeRewards(@Param('id') id: string) {
    // Role check should be added here
    return this.leagueService.processLeagueRewards(id);
  }
}
