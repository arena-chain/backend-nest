import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrainingService } from './training.service';

@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('result')
  async saveResult(@Req() req: any, @Body() body: any) {
    const userId = req.user?.userId;
    return this.trainingService.saveResult(userId, body);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('difficulty') difficulty?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const data = await this.trainingService.getLeaderboard(
      difficulty || undefined,
      limitNum,
    );
    return { data };
  }
}
