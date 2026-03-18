import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationStatus } from './schemas/invitation.schema';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  create(
    @Body() dto: CreateInvitationDto,
    @Body('senderId') senderId: string,
  ) {
    if (!senderId) throw new BadRequestException('senderId is required');
    return this.invitationService.create(dto, senderId);
  }

  @Get()
  findAll(@Query('status') status?: InvitationStatus) {
    return this.invitationService.findAll(status);
  }

  @Get('team/:teamId')
  findByTeam(
    @Param('teamId') teamId: string,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationService.findByTeam(teamId, status);
  }

  /**
   * Invitations for teams managed by this team manager.
   * Team manager consults their invitations here.
   */
  @Get('team-manager/:userId')
  findByTeamManager(
    @Param('userId') userId: string,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationService.findByTeamManager(userId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invitationService.findOne(id);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Body('teamManagerUserId') teamManagerUserId: string,
  ) {
    if (!teamManagerUserId) throw new BadRequestException('teamManagerUserId is required');
    return this.invitationService.accept(id, teamManagerUserId);
  }

  @Post(':id/decline')
  decline(
    @Param('id') id: string,
    @Body('teamManagerUserId') teamManagerUserId: string,
  ) {
    if (!teamManagerUserId) throw new BadRequestException('teamManagerUserId is required');
    return this.invitationService.decline(id, teamManagerUserId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invitationService.remove(id);
  }
}
