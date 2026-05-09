import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PresenceService, UserStatus } from './presence.service';

@ApiTags('Presence')
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('friends/:userId')
  @ApiOperation({
    summary: 'Get accepted friends with their online/offline presence',
  })
  @ApiParam({ name: 'userId', description: 'Current user ID' })
  @ApiResponse({
    status: 200,
    description:
      'Returns accepted friends only, each with presence status (online, in_game, in_queue, away, offline).',
  })
  async getFriendsPresence(@Param('userId') userId: string) {
    const friends = await this.presenceService.getFriendsPresence(userId);
    const order: Record<UserStatus, number> = {
      [UserStatus.IN_GAME]: 0,
      [UserStatus.IN_QUEUE]: 1,
      [UserStatus.ONLINE]: 2,
      [UserStatus.AWAY]: 3,
      [UserStatus.OFFLINE]: 4,
    };
    friends.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));
    return { friends };
  }
}
