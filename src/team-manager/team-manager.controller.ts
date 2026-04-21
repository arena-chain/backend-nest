import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { TeamManagerService } from './team-manager.service';
import { UpdateTeamManagerDto } from './dto/update-team-manager.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

class CreateTeamDto {
  @ApiProperty({ description: 'Team name (must be unique)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Organization name (auto-filled from profile if omitted)',
  })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({ description: 'Team logo — base64 string or URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Team description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['amateur', 'pro'], default: 'amateur' })
  @IsOptional()
  @IsEnum(['amateur', 'pro'])
  type?: string;
}

class InvitePlayerDto {
  @ApiProperty({ description: 'User ID of the player to invite' })
  @IsString()
  playerUserId: string;
}

@ApiTags('team-manager')
@Controller('team-manager')
export class TeamManagerController {
  constructor(private readonly teamManagerService: TeamManagerService) {}

  // ─── Admin routes ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all team managers (Admin)' })
  findAll() {
    return this.teamManagerService.findAll();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending team managers (Admin only)' })
  findPending() {
    return this.teamManagerService.findPending();
  }

  @Patch(':userId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a team manager (Admin only)' })
  approve(@Param('userId') userId: string) {
    return this.teamManagerService.approve(userId);
  }

  @Patch(':userId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a team manager (Admin only)' })
  reject(@Param('userId') userId: string) {
    return this.teamManagerService.reject(userId);
  }

  // ─── Authenticated team-manager routes ───────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my team manager profile (with team populated)',
  })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  getMe(@Request() req) {
    return this.teamManagerService.findByUserIdWithTeam(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my team manager profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateMe(@Request() req, @Body() dto: UpdateTeamManagerDto) {
    return this.teamManagerService.update(req.user.userId, dto);
  }

  // ─── Team management ─────────────────────────────────────────────────────

  @Post('me/team')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a team for my profile' })
  @ApiResponse({
    status: 201,
    description: 'Team created and linked to manager',
  })
  @ApiResponse({ status: 409, description: 'Manager already has a team' })
  createTeam(@Request() req, @Body() dto: CreateTeamDto) {
    return this.teamManagerService.createTeamForManager(req.user.userId, dto);
  }

  @Get('me/team')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my team with full roster' })
  @ApiResponse({ status: 200, description: 'Team with populated members' })
  @ApiResponse({ status: 404, description: 'No team linked yet' })
  getMyTeam(@Request() req) {
    return this.teamManagerService.getMyTeam(req.user.userId);
  }

  @Patch('me/team')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my team (name, logo, description, etc.)' })
  updateMyTeam(@Request() req, @Body() dto: CreateTeamDto) {
    return this.teamManagerService.updateTeam(req.user.userId, dto);
  }

  // ─── Roster management ───────────────────────────────────────────────────

  @Post('me/team/roster/invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite an existing player to the roster' })
  @ApiResponse({ status: 201, description: 'Player added to roster' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  @ApiResponse({ status: 409, description: 'Player already in roster' })
  invitePlayer(@Request() req, @Body() dto: InvitePlayerDto) {
    return this.teamManagerService.invitePlayer(
      req.user.userId,
      dto.playerUserId,
    );
  }

  @Delete('me/team/roster/:playerUserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a player from the roster' })
  @ApiResponse({ status: 200, description: 'Player removed from roster' })
  removePlayer(@Request() req, @Param('playerUserId') playerUserId: string) {
    return this.teamManagerService.removePlayer(req.user.userId, playerUserId);
  }

  @Get('me/team/roster/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search by nickname or email',
  })
  @ApiOperation({ summary: 'Search available players to invite' })
  searchPlayers(@Query('q') search?: string) {
    return this.teamManagerService.searchAvailablePlayers(search);
  }

  // ─── Public lookup ────────────────────────────────────────────────────────

  @Get(':userId')
  @ApiOperation({ summary: 'Get team manager profile by user ID (public)' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  findByUserId(@Param('userId') userId: string) {
    return this.teamManagerService.findByUserIdWithTeam(userId);
  }
}
