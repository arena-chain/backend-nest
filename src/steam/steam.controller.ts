import { Controller, Post, Get, Delete, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SteamVerificationService } from './steam-verification.service';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('steam')
@ApiBearerAuth('JWT-auth')
@Controller(['steam-verification', 'steam'])
@UseGuards(JwtAuthGuard)
export class SteamController {
  constructor(
    private readonly steamService: SteamVerificationService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  @Post('link')
  async link(@Req() req, @Body('steamId') steamId: string) {
    await this.steamService.linkSteamAccount(req.user.userId, steamId);
    return { message: 'Steam account linked. Verifying...' };
  }

  @Post('verify')
  async verify(@Req() req, @Body('steamId') steamId: string) {
    const user = await this.steamService.verifySteamOwnership(req.user.userId, steamId);
    return {
      verified: true,
      steamUsername: user.steamUsername,
      steamAvatarUrl: user.steamAvatarUrl,
    };
  }

  @Get('status')
  async status(@Req() req) {
    const user = await this.steamService['userModel'].findById(req.user.userId).lean();
    return {
      steamVerified: user?.steamVerified || false,
      steamId: user?.steamId || null,
      steamUsername: user?.steamUsername || null,
      steamAvatarUrl: user?.steamAvatarUrl || null,
    };
  }

  @Delete('unlink')
  async unlink(@Req() req) {
    const userId = req.user.userId;
    
    // Safety check: Cannot unlink while in queue or match
    const activeTicket = await this.matchmakingService.getActiveTicket(userId);
    const activeGame = await this.matchmakingService.getActiveGame(userId);
    
    if (activeTicket || activeGame) {
      throw new BadRequestException('Cannot unlink Steam account while in queue or match');
    }

    await this.steamService.unlinkSteamAccount(userId);
    return { message: 'Steam account unlinked' };
  }
}
