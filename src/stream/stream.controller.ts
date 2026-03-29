import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StreamService } from './stream.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';

@ApiTags('stream')
@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new stream' })
  @ApiResponse({ status: 201, description: 'Stream created successfully' })
  create(@Body() createStreamDto: CreateStreamDto) {
    return this.streamService.create(createStreamDto);
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
  @ApiOperation({ summary: 'Update stream' })
  @ApiResponse({ status: 200, description: 'Stream updated successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  update(@Param('id') id: string, @Body() updateStreamDto: UpdateStreamDto) {
    return this.streamService.update(id, updateStreamDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete stream' })
  @ApiResponse({ status: 200, description: 'Stream deleted successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  remove(@Param('id') id: string) {
    return this.streamService.remove(id);
  }
}
