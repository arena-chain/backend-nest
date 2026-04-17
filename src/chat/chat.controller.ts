import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
