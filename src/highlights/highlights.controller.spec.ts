import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HighlightsController } from './highlights.controller';
import { HighlightsService } from './highlights.service';
import { HighlightBullmqService } from './queue/highlight-bullmq.service';
import { HighlightsEngagementService } from './highlights-engagement.service';
import { Highlight } from './schemas/highlight.schema';
import { Video } from '../video/schema/video.schema';

describe('HighlightsController', () => {
  let controller: HighlightsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HighlightsController],
      providers: [
        HighlightsService,
        {
          provide: HighlightBullmqService,
          useValue: {
            enqueueProcessHighlights: jest
              .fn()
              .mockResolvedValue({ jobId: 'test-job' }),
          },
        },
        {
          provide: HighlightsEngagementService,
          useValue: {
            getEngagement: jest.fn(),
            listComments: jest.fn(),
            addComment: jest.fn(),
            like: jest.fn(),
            unlike: jest.fn(),
            deleteComment: jest.fn(),
            likeComment: jest.fn(),
            unlikeComment: jest.fn(),
            saveHighlight: jest.fn(),
            unsaveHighlight: jest.fn(),
          },
        },
        { provide: getModelToken(Highlight.name), useValue: {} },
        { provide: getModelToken(Video.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<HighlightsController>(HighlightsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
