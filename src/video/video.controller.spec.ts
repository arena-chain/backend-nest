import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { HighlightBullmqService } from '../highlights/queue/highlight-bullmq.service';
import { VideoEngagementService } from './video-engagement.service';
import { Video } from './schema/video.schema';

describe('VideoController', () => {
  let controller: VideoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        VideoService,
        { provide: getModelToken(Video.name), useValue: {} },
        {
          provide: HighlightBullmqService,
          useValue: {
            enqueueProcessHighlights: jest
              .fn()
              .mockResolvedValue({ jobId: 'job-1' }),
          },
        },
        {
          provide: VideoEngagementService,
          useValue: {
            getEngagement: jest.fn(),
            listComments: jest.fn(),
            addComment: jest.fn(),
            like: jest.fn(),
            unlike: jest.fn(),
            likeComment: jest.fn(),
            unlikeComment: jest.fn(),
            deleteComment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
