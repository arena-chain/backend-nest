import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { videoUploadOptions } from '../common/utils/file-upload.utils';
import { HighlightBullmqService } from '../highlights/queue/highlight-bullmq.service';
import { parseHighlightVisibility } from '../highlights/utils/highlight-visibility.util';
import { VideoDocument } from './schema/video.schema';
import { VideoEngagementService } from './video-engagement.service';
import { CreateVideoCommentDto } from './dto/create-video-comment.dto';
import { HighlightSelectionMode } from '../highlights/highlights.service';
import * as path from 'path';
import { GamingVideoClassifierService } from './gaming-video-classifier.service';

@ApiTags('Video')
@Controller('video')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);
  private static readonly DEFAULT_HIGHLIGHT_MODE: HighlightSelectionMode =
    'all';
  private static readonly DEFAULT_HIGHLIGHT_TOP_K = 3;
  private static readonly DEFAULT_HIGHLIGHT_MIN_SCORE = 0.62;
  private static readonly DEFAULT_HIGHLIGHT_MIN_GAP_SEC = 8;
  private static readonly DEFAULT_HIGHLIGHT_CLIP_DURATION_SEC = 12;

  constructor(
    private readonly videoService: VideoService,
    private readonly highlightBullmq: HighlightBullmqService,
    private readonly videoEngagement: VideoEngagementService,
    private readonly gamingClassifier: GamingVideoClassifierService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new video' })
  @ApiResponse({
    status: 201,
    description: 'The video has been successfully created.',
  })
  create(@Body() createVideoDto: CreateVideoDto) {
    return this.videoService.create(createVideoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  findAll(
    @Query('uploader') uploader?: string,
    @Query('game') game?: string,
    @Query('channelPublic') channelPublic?: string,
  ) {
    return this.videoService.findAll({
      uploader,
      game,
      channelPublic: channelPublic === 'true' || channelPublic === '1',
    });
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
        uploader: {
          type: 'string',
          description: 'Optional; defaults to authenticated user id',
        },
        game: { type: 'string' },
        thumbnailUrl: { type: 'string' },
        duration: { type: 'number' },
        highlightsVisibility: {
          type: 'string',
          enum: ['public', 'private'],
          description: 'Visibility for generated highlights (default: private)',
        },
        channelVisibility: {
          type: 'string',
          enum: ['public', 'private'],
          description:
            'Show this video on your channel page when public (default: private)',
        },
        highlightMode: {
          type: 'string',
          enum: ['top_k', 'threshold', 'all'],
          description: 'How highlights are selected (default: all)',
        },
        highlightTopK: {
          type: 'number',
          description: 'Used when highlightMode=top_k (default: 3)',
        },
        highlightMinScore: {
          type: 'number',
          description: 'Used when highlightMode=threshold (0..1)',
        },
        highlightMinGapSec: {
          type: 'number',
          description: 'Minimum seconds between selected highlights',
        },
        highlightClipDurationSec: {
          type: 'number',
          description: 'Duration of each generated clip in seconds',
        },
        highlightMaxTotalSec: {
          type: 'number',
          description: 'Optional cap for cumulative generated clip seconds',
        },
        highlightFullScan: {
          type: 'boolean',
          description:
            'If true, scans full timeline; if false, uses faster sparse scan',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', videoUploadOptions))
  async upload(
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

    const uploadedPath =
      typeof file.path === 'string'
        ? path.resolve(file.path)
        : path.resolve(process.cwd(), 'uploads', 'videos', file.filename);
    await this.gamingClassifier.assertGamingVideo(uploadedPath);

    const channelVisRaw = (body as { channelVisibility?: string })
      .channelVisibility;
    const createVideoDto: CreateVideoDto = {
      title: body.title,
      description: body.description,
      url: `/uploads/videos/${file.filename}`,
      thumbnailUrl: body.thumbnailUrl,
      uploader,
      game: body.game,
      duration: body.duration ? Number(body.duration) : undefined,
      channelVisibility: channelVisRaw === 'public' ? 'public' : 'private',
    };
    const video = (await this.videoService.create(
      createVideoDto,
    )) as VideoDocument;
    const videoId = video._id.toString();

    const visibility = parseHighlightVisibility(
      (body as { highlightsVisibility?: string }).highlightsVisibility,
    );
    const parsedMode = this.parseHighlightMode(
      (body as { highlightMode?: string }).highlightMode,
    );
    const highlightTopK = this.parsePositiveInt(
      (body as { highlightTopK?: string | number }).highlightTopK,
      VideoController.DEFAULT_HIGHLIGHT_TOP_K,
    );
    const highlightMinScore = this.parseScore(
      (body as { highlightMinScore?: string | number }).highlightMinScore,
      VideoController.DEFAULT_HIGHLIGHT_MIN_SCORE,
    );
    const highlightMinGapSec = this.parsePositiveInt(
      (body as { highlightMinGapSec?: string | number }).highlightMinGapSec,
      VideoController.DEFAULT_HIGHLIGHT_MIN_GAP_SEC,
    );
    const highlightClipDurationSec = this.parsePositiveInt(
      (body as { highlightClipDurationSec?: string | number })
        .highlightClipDurationSec,
      VideoController.DEFAULT_HIGHLIGHT_CLIP_DURATION_SEC,
    );
    const highlightMaxTotalSec = this.parseOptionalPositiveInt(
      (body as { highlightMaxTotalSec?: string | number }).highlightMaxTotalSec,
    );
    const highlightFullScan = this.parseBoolean(
      (body as { highlightFullScan?: string | boolean }).highlightFullScan,
      true,
    );

    const videoJson = video.toObject();

    try {
      const { jobId } = await this.highlightBullmq.enqueueProcessHighlights({
        videoId,
        uploaderId: uploader,
        visibility,
        selectionMode: parsedMode,
        topK: highlightTopK,
        minScore: highlightMinScore,
        minGapSec: highlightMinGapSec,
        clipDurationSec: highlightClipDurationSec,
        maxTotalSec: highlightMaxTotalSec,
        fullScan: highlightFullScan,
      });
      return {
        video: videoJson,
        highlightJobId: jobId,
        highlightConfig: {
          mode: parsedMode,
          topK: highlightTopK,
          minScore: highlightMinScore,
          minGapSec: highlightMinGapSec,
          clipDurationSec: highlightClipDurationSec,
          maxTotalSec: highlightMaxTotalSec ?? null,
          fullScan: highlightFullScan,
        },
      };
    } catch (err) {
      this.logger.warn(
        `Video ${videoId} saved but highlight job was not enqueued: ${err instanceof Error ? err.message : err}`,
      );
      return {
        video: videoJson,
        highlightJobId: null,
        highlightConfig: {
          mode: parsedMode,
          topK: highlightTopK,
          minScore: highlightMinScore,
          minGapSec: highlightMinGapSec,
          clipDurationSec: highlightClipDurationSec,
          maxTotalSec: highlightMaxTotalSec ?? null,
          fullScan: highlightFullScan,
        },
      };
    }
  }

  private parseHighlightMode(value?: string): HighlightSelectionMode {
    if (value === 'top_k' || value === 'threshold' || value === 'all') {
      return value;
    }
    return VideoController.DEFAULT_HIGHLIGHT_MODE;
  }

  private parsePositiveInt(value: string | number | undefined, fallback: number) {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
  }

  private parseOptionalPositiveInt(value?: string | number): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.floor(n);
  }

  private parseScore(value: string | number | undefined, fallback: number): number {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  }

  private parseBoolean(
    value: string | boolean | undefined,
    fallback: boolean,
  ): boolean {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return fallback;
  }

  @Get(':id/engagement')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Video like count, comment count, likedByMe' })
  getEngagement(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    return this.videoEngagement.getEngagement(id, req.user?.userId);
  }

  @Get(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Threaded comments for a video' })
  listComments(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    return this.videoEngagement.listComments(id, req.user?.userId);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment or reply on a video' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateVideoCommentDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoEngagement.addComment(
      id,
      userId,
      dto.body,
      dto.parentCommentId,
    );
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a video' })
  likeVideo(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoEngagement.like(id, userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your like on a video' })
  unlikeVideo(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoEngagement.unlike(id, userId);
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a video comment' })
  likeVideoComment(
    @Param('commentId') commentId: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoEngagement.likeComment(commentId, userId);
  }

  @Delete('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove like on a video comment' })
  unlikeVideoComment(
    @Param('commentId') commentId: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoEngagement.unlikeComment(commentId, userId);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your video comment' })
  deleteVideoComment(
    @Param('commentId') commentId: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoEngagement.deleteComment(commentId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a video by ID' })
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a video (owner only)' })
  update(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoService.updateForOwner(id, userId, updateVideoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a video (owner only)' })
  remove(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.videoService.removeForOwner(id, userId);
  }
}
