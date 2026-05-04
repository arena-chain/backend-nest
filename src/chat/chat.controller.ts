import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('inbox')
  getInbox(@Req() req) {
    return this.chatService.getInbox(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversation/:userId')
  getConversation(@Param('userId') otherUserId: string, @Req() req) {
    return this.chatService.getConversation(req.user.userId, otherUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send')
  sendMessage(@Body() body: { receiverId: string; message: string }, @Req() req) {
    return this.chatService.createPrivateMessage(req.user.userId, body.receiverId, body.message);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read/:userId')
  markAsRead(@Param('userId') otherUserId: string, @Req() req) {
    return this.chatService.markAsRead(req.user.userId, otherUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('conversation/:userId')
  deleteConversation(@Param('userId') otherUserId: string, @Req() req) {
    return this.chatService.deleteConversation(req.user.userId, otherUserId);
  }

  @Post('user/:userId')
  createForUser(
    @Param('userId') userId: string,
    @Body() createChatDto: CreateChatDto,
  ) {
    return this.chatService.createForUser(userId, createChatDto);
  }

  @Post('anonymous')
  createAnonymous(
    @Body() createChatDto: CreateChatDto,
    @Body('guestNickname') guestNickname: string,
  ) {
    return this.chatService.createAnonymous(createChatDto, guestNickname);
  }

  @Get('channel/:channelId')
  findByChannel(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.findByChannel(channelId, limit ? +limit : 50);
  }
}

