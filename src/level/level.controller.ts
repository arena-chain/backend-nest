import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LevelService } from './level.service';

@ApiTags('level')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('me')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Get('level')
  @ApiOperation({ summary: 'Get current user level progression' })
  async getMyLevel(@Req() req: any) {
    const userId = req.user?.userId;

    const view = await this.levelService.getPlayerLevel(userId);
    const progressPct =
      view.xpToNextLevel > 0 ? (view.currentXP / view.xpToNextLevel) * 100 : 0;

    return {
      level: view.level,
      currentXP: view.currentXP,
      xpToNextLevel: view.xpToNextLevel,
      totalXP: view.totalXP,
      progressPct,
    };
  }
}
