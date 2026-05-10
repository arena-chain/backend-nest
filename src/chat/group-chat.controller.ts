import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('group-chat')
@UseGuards(JwtAuthGuard)
export class GroupChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('my')
  my(@Req() req: { user: { userId: string } }) {
    return this.chatService.getMyGroups(req.user.userId);
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      name: string;
      type?: 'room' | 'group';
      description?: string;
      isPrivate?: boolean;
    },
  ) {
    return this.chatService.createGroup(req.user.userId, body);
  }

  @Get(':id/messages')
  messages(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getGroupMessages(
      id,
      req.user.userId,
      limit ? +limit : 100,
    );
  }

  @Post(':id/invite')
  invite(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { memberId: string },
  ) {
    return this.chatService.inviteToGroup(id, body.memberId, req.user.userId);
  }

  @Delete(':id/leave')
  leave(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.chatService.leaveGroup(id, req.user.userId);
  }

  @Delete(':id/messages')
  clearMessages(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.chatService.deleteGroupMessages(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.chatService.deleteGroup(id, req.user.userId);
  }
}
