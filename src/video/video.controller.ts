import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { videoUploadOptions } from 'src/common/utils/file-upload.utils';

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
  findAll(
    @Query('uploader') uploader?: string,
    @Query('game') game?: string,
  ) {
    return this.videoService.findAll({ uploader, game });
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a video file and create video record' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        uploader: { type: 'string', description: 'Optional; defaults to authenticated user id' },
        game: { type: 'string' },
        thumbnailUrl: { type: 'string' },
        duration: { type: 'number' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', videoUploadOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Partial<CreateVideoDto>,
    @Request() req: { user?: { userId?: string } },
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    if (!body?.title) {
      throw new BadRequestException('title is required');
    }
    const uploader = body.uploader || req.user?.userId;
    if (!uploader) {
      throw new BadRequestException('uploader is required');
    }
    const createVideoDto: CreateVideoDto = {
      title: body.title,
      description: body.description,
      url: `/uploads/videos/${file.filename}`,
      thumbnailUrl: body.thumbnailUrl,
      uploader,
      game: body.game,
      duration: body.duration ? Number(body.duration) : undefined,
    };
    return this.videoService.create(createVideoDto);
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
