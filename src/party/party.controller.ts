import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PartyDto, PartyService } from './party.service';

export class CreatePartyDto {
  gameId: string;
  mode: 'CUSTOM_1V1' | 'CUSTOM_2V2' | 'RANKED_5V5';
}

export class InviteMemberDto {
  targetUserId: string;
}

export class RespondInviteDto {
  accept: boolean;
}

export class KickMemberDto {
  targetUserId: string;
}

export class StartQueueDto {
  ticketId: string;
}

@Controller('party')
@UseGuards(JwtAuthGuard)
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Post('create')
  async createParty(@Req() req, @Body() dto: CreatePartyDto): Promise<PartyDto> {
    return this.partyService.createParty(req.user.userId, dto.gameId, dto.mode);
  }

  @Post(':partyId/invite')
  async inviteMember(
    @Param('partyId') partyId: string,
    @Req() req,
    @Body() dto: InviteMemberDto,
  ): Promise<PartyDto> {
    return this.partyService.inviteMember(
      partyId,
      dto.targetUserId,
      req.user.userId,
    );
  }

  @Post(':partyId/respond')
  async respondToInvite(
    @Param('partyId') partyId: string,
    @Req() req,
    @Body() dto: RespondInviteDto,
  ): Promise<PartyDto> {
    return this.partyService.respondToInvite(partyId, req.user.userId, dto.accept);
  }

  @Post(':partyId/kick')
  async kickMember(
    @Param('partyId') partyId: string,
    @Req() req,
    @Body() dto: KickMemberDto,
  ): Promise<PartyDto> {
    return this.partyService.kickMember(
      partyId,
      dto.targetUserId,
      req.user.userId,
    );
  }

  @Post(':partyId/leave')
  async leaveParty(@Param('partyId') partyId: string, @Req() req) {
    await this.partyService.leaveParty(partyId, req.user.userId);
    return { message: 'Left party successfully' };
  }

  @Post(':partyId/ready')
  async markPartyReady(
    @Param('partyId') partyId: string,
    @Req() req,
  ): Promise<PartyDto> {
    return this.partyService.markPartyReady(partyId, req.user.userId);
  }

  @Post(':partyId/queue')
  async startQueueing(
    @Param('partyId') partyId: string,
    @Req() req,
    @Body() dto: StartQueueDto,
  ): Promise<PartyDto> {
    return this.partyService.startQueueing(
      partyId,
      req.user.userId,
      dto.ticketId,
    );
  }

  @Get('user/active')
  async getUserActiveParty(@Req() req): Promise<{ party: PartyDto | null }> {
    const party = await this.partyService.getPartyByUserId(req.user.userId);
    return { party };
  }

  @Get('user/list')
  async listUserParties(@Req() req): Promise<{ parties: PartyDto[] }> {
    const parties = await this.partyService.listUserParties(req.user.userId);
    return { parties };
  }

  @Get(':partyId')
  async getParty(@Param('partyId') partyId: string): Promise<PartyDto> {
    return this.partyService.getParty(partyId);
  }
}
