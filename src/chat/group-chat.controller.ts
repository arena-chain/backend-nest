import { Controller, Get, UseGuards, Req, Post, Body, Param, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('group-chat')
export class GroupChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyGroups(@Req() req) {
    return this.chatService.getMyGroups(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createGroup(@Req() req, @Body() dto: any) {
    return this.chatService.createGroup(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/messages')
  async getGroupMessages(@Param('id') id: string) {
    return this.chatService.findByChannel(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invite')
  async inviteToGroup(@Param('id') id: string, @Body() body: { memberId: string }) {
    return this.chatService.inviteToGroup(id, body.memberId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/leave')
  async leaveGroup(@Param('id') id: string, @Req() req) {
    return this.chatService.leaveGroup(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/messages')
  async clearGroupMessages(@Param('id') id: string, @Req() req) {
    return this.chatService.deleteGroupMessages(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteGroup(@Param('id') id: string, @Req() req) {
    return this.chatService.deleteGroup(id, req.user.userId);
  }
}


