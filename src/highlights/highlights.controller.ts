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
  async processVideo(
    @Param('videoId') videoId: string,
    @Param('uploaderId') uploaderId: string,
    @Query('visibility') visibilityRaw?: string,
  ) {
    const visibility = parseHighlightVisibility(visibilityRaw);
    const { jobId } = await this.highlightBullmq.enqueueProcessHighlights({
      videoId,
      uploaderId,
      visibility,
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
  async enqueueVideo(
    @Param('videoId') videoId: string,
    @Param('uploaderId') uploaderId: string,
    @Query('visibility') visibilityRaw?: string,
  ) {
    const visibility = parseHighlightVisibility(visibilityRaw);
    const { jobId } = await this.highlightBullmq.enqueueProcessHighlights({
      videoId,
      uploaderId,
      visibility,
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
}
