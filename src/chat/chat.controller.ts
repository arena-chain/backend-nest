import { Controller, Get, Param, UseGuards, Req, Patch, Query, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('debug')
  @ApiOperation({ summary: 'Debug: Get raw message count and user ID' })
  async debug(@Req() req: any) {
    const userId = req.user.userId;
    const rawMessages = await this.chatService.debugGetAllMessages(userId) as any[];
    return {
      receivedUserId: userId,
      messageCount: rawMessages.length,
      firstFewMessages: rawMessages.slice(0, 5).map((m: any) => ({
        id: m._id,
        senderId: m.senderId?.toString(),
        receiverId: m.receiverId?.toString(),
        message: m.message,
        channelId: m.channelId?.toString() || null,
        createdAt: m.createdAt
      }))
    };
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get current user conversation list (Inbox)' })
  async getInbox(@Req() req: any) {
    return this.chatService.getInbox(req.user.userId);
  }

  @Get('conversation/:interlocutorId')
  @ApiOperation({ summary: 'Get private conversation with another user' })
  async getConversation(
    @Req() req: any,
    @Param('interlocutorId') interlocutorId: string,
    @Query('limit') limit?: number
  ) {
    return this.chatService.findPrivateConversation(req.user.userId, interlocutorId, limit);
  }

  @Patch('read/:senderId')
  @ApiOperation({ summary: 'Mark messages from a specific sender as read' })
  async markAsRead(@Req() req: any, @Param('senderId') senderId: string) {
    return this.chatService.markAsRead(req.user.userId, senderId);
  }

  @Delete('message/:id')
  @ApiOperation({ summary: 'Delete a single private message' })
  async deleteMessage(@Req() req: any, @Param('id') id: string) {
    return this.chatService.deleteMessage(req.user.userId, id);
  }

  @Delete('conversation/:interlocutorId')
  @ApiOperation({ summary: 'Delete entire private conversation history' })
  async deleteConversation(@Req() req: any, @Param('interlocutorId') interlocutorId: string) {
    return this.chatService.deleteConversation(req.user.userId, interlocutorId);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get channel chat history' })
  async getChannelChat(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number
  ) {
    return this.chatService.findByChannel(channelId, limit);
  }
}
