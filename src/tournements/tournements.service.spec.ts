import { Test, TestingModule } from '@nestjs/testing';
import { TournementsService } from './tournements.service';

describe('TournementsService', () => {
  let service: TournementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TournementsService],
    }).compile();

    service = module.get<TournementsService>(TournementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
