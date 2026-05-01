import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SteamVerificationService } from '../steam-verification.service';

@Injectable()
export class SteamVerificationGuard implements CanActivate {
  constructor(private steamService: SteamVerificationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const body = request.body;

    if (!userId) {
      return false;
    }

    // Only enforce Steam verification for Steam-based games
    const steamGames = ['DOTA2', 'CS2'];
    const game = body?.game?.toUpperCase();
    if (game && steamGames.includes(game)) {
        const isVerified = await this.steamService.isVerified(userId);
        if (!isVerified) {
            throw new ForbiddenException('Steam account verification required for this game');
        }
    }

    return true;
  }
}
