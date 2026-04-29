import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { HighlightsService } from './highlights.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HighlightBullmqService } from './queue/highlight-bullmq.service';
import { parseHighlightVisibility } from './utils/highlight-visibility.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { UpdateHighlightVisibilityDto } from './dto/update-highlight-visibility.dto';
import { UpdateHighlightDetailsDto } from './dto/update-highlight-details.dto';
import { HighlightsEngagementService } from './highlights-engagement.service';
import { CreateHighlightCommentDto } from './dto/create-highlight-comment.dto';
import { HighlightSelectionMode } from './highlights.service';

@ApiTags('Highlights')
@Controller('highlights')
export class HighlightsController {
  constructor(
    private readonly highlightsService: HighlightsService,
    private readonly highlightBullmq: HighlightBullmqService,
    private readonly engagementService: HighlightsEngagementService,
  ) {}

  @Post('process/:videoId/:uploaderId')
  @ApiOperation({
    summary: 'Queue highlight generation (same as enqueue; async via BullMQ)',
  })
  @ApiQuery({
    name: 'visibility',
    required: false,
    description: 'public | private (default: private)',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'top_k | threshold | all (default: top_k)',
  })
  @ApiQuery({
    name: 'topK',
    required: false,
    description: 'Used for mode=top_k (default: 3)',
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    description: 'Used for mode=threshold, between 0 and 1',
  })
  async processVideo(
    @Param('videoId') videoId: string,
    @Param('uploaderId') uploaderId: string,
    @Query('visibility') visibilityRaw?: string,
    @Query('mode') modeRaw?: string,
    @Query('topK') topKRaw?: string,
    @Query('count') countRaw?: string,
    @Query('clips') clipsRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('minScore') minScoreRaw?: string,
  ) {
    const visibility = parseHighlightVisibility(visibilityRaw);
    const mode = this.parseMode(modeRaw);
    const topKValue = this.parseTopK(topKRaw, countRaw, clipsRaw, limitRaw);
    const { jobId } = await this.highlightBullmq.enqueueProcessHighlights({
      videoId,
      uploaderId,
      visibility,
      selectionMode: mode,
      topK: topKValue,
      minScore: this.parseScore(minScoreRaw, 0.7),
    });
    return {
      message: 'Video queued for highlight generation',
      jobId,
    };
  }

  @Post('enqueue/:videoId/:uploaderId')
  @ApiOperation({ summary: 'Enqueue highlight generation job' })
  @ApiQuery({
    name: 'visibility',
    required: false,
    description: 'public | private (default: private)',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'top_k | threshold | all (default: top_k)',
  })
  @ApiQuery({
    name: 'topK',
    required: false,
    description: 'Used for mode=top_k (default: 3)',
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    description: 'Used for mode=threshold, between 0 and 1',
  })
  async enqueueVideo(
    @Param('videoId') videoId: string,
    @Param('uploaderId') uploaderId: string,
    @Query('visibility') visibilityRaw?: string,
    @Query('mode') modeRaw?: string,
    @Query('topK') topKRaw?: string,
    @Query('count') countRaw?: string,
    @Query('clips') clipsRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('minScore') minScoreRaw?: string,
  ) {
    const visibility = parseHighlightVisibility(visibilityRaw);
    const mode = this.parseMode(modeRaw);
    const topKValue = this.parseTopK(topKRaw, countRaw, clipsRaw, limitRaw);
    const { jobId } = await this.highlightBullmq.enqueueProcessHighlights({
      videoId,
      uploaderId,
      visibility,
      selectionMode: mode,
      topK: topKValue,
      minScore: this.parseScore(minScoreRaw, 0.7),
    });
    return {
      message: 'Video queued for highlight generation',
      jobId,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all highlights (includes private)' })
  findAll() {
    return this.highlightsService.findAll();
  }

  @Get('public')
  @ApiOperation({ summary: 'List public highlights only (feed-safe)' })
  findPublic() {
    return this.highlightsService.findPublic();
  }

  @Get('video/:videoId')
  @ApiOperation({ summary: 'Get highlights for a specific video' })
  @ApiQuery({
    name: 'publicOnly',
    required: false,
    description: 'If true, only public highlights',
  })
  findByVideo(
    @Param('videoId') videoId: string,
    @Query('publicOnly') publicOnly?: string,
  ) {
    return this.highlightsService.findByVideo(videoId, {
      publicOnly: publicOnly === 'true' || publicOnly === '1',
    });
  }

  @Get('debug/video/:videoId')
  @ApiOperation({
    summary:
      'FFmpeg highlight analysis debug (candidates, scores, selected/dropped reasons)',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'top_k | threshold | all (default: top_k)',
  })
  @ApiQuery({
    name: 'topK',
    required: false,
    description: 'Used for mode=top_k (default: 3)',
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    description: 'Used for mode=threshold, between 0 and 1',
  })
  @ApiQuery({
    name: 'minGapSec',
    required: false,
    description: 'Minimum seconds gap between selected clips',
  })
  @ApiQuery({
    name: 'clipDurationSec',
    required: false,
    description: 'Duration of each highlight candidate in seconds',
  })
  @ApiQuery({
    name: 'maxTotalSec',
    required: false,
    description: 'Optional total duration cap for selected highlights',
  })
  @ApiQuery({
    name: 'fullScan',
    required: false,
    description: 'true|false, whether to scan the full timeline densely',
  })
  debugAnalyzeVideo(
    @Param('videoId') videoId: string,
    @Query('mode') modeRaw?: string,
    @Query('topK') topKRaw?: string,
    @Query('minScore') minScoreRaw?: string,
    @Query('minGapSec') minGapSecRaw?: string,
    @Query('clipDurationSec') clipDurationSecRaw?: string,
    @Query('maxTotalSec') maxTotalSecRaw?: string,
    @Query('fullScan') fullScanRaw?: string,
  ) {
    return this.highlightsService.debugAnalyzeVideoById(videoId, {
      selectionMode: this.parseMode(modeRaw),
      topK: this.parsePositiveInt(topKRaw, 3),
      minScore: this.parseScore(minScoreRaw, 0.7),
      minGapSec: this.parsePositiveInt(minGapSecRaw, 8),
      clipDurationSec: this.parsePositiveInt(clipDurationSecRaw, 12),
      maxTotalSec: this.parseOptionalPositiveInt(maxTotalSecRaw),
      fullScan: this.parseBoolean(fullScanRaw, true),
    });
  }

  @Get(':id/engagement')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Like count, comment count, and whether the current user liked',
  })
  getEngagement(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    return this.engagementService.getEngagement(id, req.user?.userId);
  }

  @Get(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List comments for a highlight' })
  listComments(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    return this.engagementService.listComments(id, req.user?.userId);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment (authenticated)' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateHighlightCommentDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.addComment(
      id,
      userId,
      dto.body,
      dto.parentCommentId,
    );
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a highlight' })
  like(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.like(id, userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your like' })
  unlike(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.unlike(id, userId);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save highlight to your list (saved highlights)' })
  saveHighlight(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.saveHighlight(id, userId);
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove highlight from saved list' })
  unsaveHighlight(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.unsaveHighlight(id, userId);
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a comment' })
  likeComment(
    @Param('commentId') commentId: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.likeComment(commentId, userId);
  }

  @Delete('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your like on a comment' })
  unlikeComment(
    @Param('commentId') commentId: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.unlikeComment(commentId, userId);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your own comment' })
  deleteComment(
    @Param('commentId') commentId: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.engagementService.deleteComment(commentId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a highlight by ID' })
  findOne(@Param('id') id: string) {
    return this.highlightsService.findOne(id);
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set highlight visibility (creator only): public or private',
  })
  async updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateHighlightVisibilityDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.highlightsService.updateVisibility(id, userId, dto.visibility);
  }

  @Patch(':id/details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update highlight title/description (creator only)',
  })
  async updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateHighlightDetailsDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.highlightsService.updateDetails(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a highlight (creator only)' })
  remove(
    @Param('id') id: string,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.highlightsService.removeForOwner(id, userId);
  }

  private parseMode(value?: string): HighlightSelectionMode {
    if (value === 'top_k' || value === 'threshold' || value === 'all') {
      return value;
    }
    return 'all';
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
  }

  private parseScore(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  }

  private parseTopK(
    topK?: string,
    count?: string,
    clips?: string,
    limit?: string,
  ): number {
    return this.parsePositiveInt(topK ?? count ?? clips ?? limit, 3);
  }

  private parseOptionalPositiveInt(value?: string): number | undefined {
    if (!value) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.floor(n);
  }

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    const v = value.toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return fallback;
  }
}
