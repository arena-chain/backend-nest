import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StreamService } from './stream.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('stream')
@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) { }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current creator streams' })
  findMine(@Req() req) {
    return this.streamService.findMine(req.user.userId);
  }

  @Get('rtc-config')
  @ApiOperation({ summary: 'Get public WebRTC ICE configuration' })
  getRtcConfig() {
    return this.streamService.getRtcConfig();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stream' })
  @ApiResponse({ status: 201, description: 'Stream created successfully' })
  create(@Req() req, @Body() createStreamDto: CreateStreamDto) {
    return this.streamService.create(req.user.userId, createStreamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all streams' })
  @ApiResponse({ status: 200, description: 'List of all streams' })
  findAll() {
    return this.streamService.findAll();
  }

  @Get('live')
  @ApiOperation({ summary: 'Get all live streams' })
  @ApiResponse({ status: 200, description: 'List of live streams' })
  findLive() {
    return this.streamService.findLiveStreams();
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get streams by channel ID' })
  findByChannel(@Param('channelId') channelId: string) {
    return this.streamService.findByChannel(channelId);
  }

  @Get('streamer/:streamerId')
  @ApiOperation({ summary: 'Get streams by streamer ID' })
  @ApiResponse({ status: 200, description: 'List of streams by streamer' })
  findByStreamer(@Param('streamerId') streamerId: string) {
    return this.streamService.findByStreamer(streamerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stream by ID' })
  @ApiResponse({ status: 200, description: 'Stream found' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  findOne(@Param('id') id: string) {
    return this.streamService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update stream' })
  @ApiResponse({ status: 200, description: 'Stream updated successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  update(@Req() req, @Param('id') id: string, @Body() updateStreamDto: UpdateStreamDto) {
    return this.streamService.update(id, req.user.userId, updateStreamDto);
  }

  @Patch(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start stream' })
  start(@Req() req, @Param('id') id: string) {
    return this.streamService.start(id, req.user.userId);
  }

  @Patch(':id/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End stream' })
  end(@Req() req, @Param('id') id: string) {
    return this.streamService.end(id, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete stream' })
  @ApiResponse({ status: 200, description: 'Stream deleted successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  remove(@Req() req, @Param('id') id: string) {
    return this.streamService.remove(id, req.user.userId);
  }
}
