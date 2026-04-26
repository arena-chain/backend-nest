import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipsService } from './partnerships.service';

describe('PartnershipsService', () => {
  let service: PartnershipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnershipsService],
    }).compile();

    service = module.get<PartnershipsService>(PartnershipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
