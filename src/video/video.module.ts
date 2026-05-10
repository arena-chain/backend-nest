import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { Video, VideoSchema } from './schema/video.schema';
import {
  VideoComment,
  VideoCommentSchema,
} from './schema/video-comment.schema';
import { VideoLike, VideoLikeSchema } from './schema/video-like.schema';
import {
  VideoCommentLike,
  VideoCommentLikeSchema,
} from './schema/video-comment-like.schema';
import { VideoEngagementService } from './video-engagement.service';
import { HighlightsModule } from '../highlights/highlights.module';
import { GamingVideoClassifierService } from './gaming-video-classifier.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: VideoComment.name, schema: VideoCommentSchema },
      { name: VideoLike.name, schema: VideoLikeSchema },
      { name: VideoCommentLike.name, schema: VideoCommentLikeSchema },
    ]),
    HighlightsModule,
  ],
  controllers: [VideoController],
  providers: [
    VideoService,
    VideoEngagementService,
    GamingVideoClassifierService,
  ],
  exports: [VideoService],
})
export class VideoModule {}
