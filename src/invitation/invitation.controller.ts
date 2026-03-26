import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationStatus } from './schemas/invitation.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  // ─── Admin / Organiser routes ─────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an invitation to a team (organiser/admin)' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  create(
    @Body() dto: CreateInvitationDto,
    @Request() req,
  ) {
    return this.invitationService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invitations (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: InvitationStatus })
  findAll(@Query('status') status?: InvitationStatus) {
    return this.invitationService.findAll(status);
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'Get invitations for a specific team' })
  @ApiQuery({ name: 'status', required: false, enum: InvitationStatus })
  findByTeam(
    @Param('teamId') teamId: string,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationService.findByTeam(teamId, status);
  }

  // ─── Team Manager routes (JWT) ────────────────────────────────────────────

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invitations for my team (team manager)' })
  @ApiQuery({ name: 'status', required: false, enum: InvitationStatus })
  findMy(
    @Request() req,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationService.findByTeamManager(req.user.userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invitation by ID' })
  findOne(@Param('id') id: string) {
    return this.invitationService.findOne(id);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept an invitation (team manager — joins tournament or league)' })
  @ApiResponse({ status: 201, description: 'Invitation accepted, team registered' })
  @ApiResponse({ status: 403, description: 'You do not manage this team' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already responded' })
  accept(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.invitationService.accept(id, req.user.userId);
  }

  @Post(':id/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline an invitation (team manager)' })
  @ApiResponse({ status: 201, description: 'Invitation declined' })
  @ApiResponse({ status: 403, description: 'You do not manage this team' })
  decline(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.invitationService.decline(id, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an invitation (admin/organiser)' })
  remove(@Param('id') id: string) {
    return this.invitationService.remove(id);
  }
}
