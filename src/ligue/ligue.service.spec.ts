import { Test, TestingModule } from '@nestjs/testing';
import { LigueService } from './ligue.service';

describe('LigueService', () => {
  let service: LigueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LigueService],
    }).compile();

    service = module.get<LigueService>(LigueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
