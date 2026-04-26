import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Video')
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new video' })
  @ApiResponse({ status: 201, description: 'The video has been successfully created.' })
  create(@Body() createVideoDto: CreateVideoDto) {
    return this.videoService.create(createVideoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  findAll() {
    return this.videoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a video by ID' })
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a video' })
  update(@Param('id') id: string, @Body() updateVideoDto: UpdateVideoDto) {
    return this.videoService.update(id, updateVideoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a video' })
  remove(@Param('id') id: string) {
    return this.videoService.remove(id);
  }
}
