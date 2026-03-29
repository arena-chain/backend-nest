import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Send a chat message to a live channel' })
  create(@Req() req, @Body() createChatDto: CreateChatDto) {
    return this.chatService.createForUser(req.user.userId, createChatDto);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get recent chat messages for a live channel' })
  findByChannel(@Param('channelId') channelId: string, @Query('limit') limit?: string) {
    return this.chatService.findByChannel(channelId, limit ? Number(limit) : 50);
  }
}
