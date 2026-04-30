import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HighlightsService } from './highlights.service';
import { Highlight } from './schemas/highlight.schema';
import { Video } from '../video/schema/video.schema';

describe('HighlightsService', () => {
  let service: HighlightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HighlightsService,
        { provide: getModelToken(Highlight.name), useValue: {} },
        { provide: getModelToken(Video.name), useValue: {} },
      ],
    }).compile();

    service = module.get<HighlightsService>(HighlightsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
