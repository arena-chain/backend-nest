import { Test, TestingModule } from '@nestjs/testing';
import { HighlightsController } from './highlights.controller';
import { HighlightsService } from './highlights.service';

describe('HighlightsController', () => {
  let controller: HighlightsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HighlightsController],
      providers: [HighlightsService],
    }).compile();

    controller = module.get<HighlightsController>(HighlightsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
