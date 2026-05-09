import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HighlightsService } from './highlights.service';
import { HighlightsController } from './highlights.controller';
import { Highlight, HighlightSchema } from './schemas/highlight.schema';
import { Video, VideoSchema } from '../video/schema/video.schema';
import { HighlightBullmqService } from './queue/highlight-bullmq.service';
import {
  HighlightComment,
  HighlightCommentSchema,
} from './schemas/highlight-comment.schema';
import {
  HighlightLike,
  HighlightLikeSchema,
} from './schemas/highlight-like.schema';
import {
  HighlightCommentLike,
  HighlightCommentLikeSchema,
} from './schemas/highlight-comment-like.schema';
import { HighlightsEngagementService } from './highlights-engagement.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Highlight.name, schema: HighlightSchema },
      { name: Video.name, schema: VideoSchema },
      { name: HighlightComment.name, schema: HighlightCommentSchema },
      { name: HighlightLike.name, schema: HighlightLikeSchema },
      { name: HighlightCommentLike.name, schema: HighlightCommentLikeSchema },
    ]),
  ],
  controllers: [HighlightsController],
  providers: [
    HighlightsService,
    HighlightBullmqService,
    HighlightsEngagementService,
  ],
  exports: [HighlightsService, HighlightBullmqService],
})
export class HighlightsModule {}
