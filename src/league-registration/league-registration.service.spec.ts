import { Test, TestingModule } from '@nestjs/testing';
import { LeagueRegistrationService } from './league-registration.service';

describe('LeagueRegistrationService', () => {
  let service: LeagueRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeagueRegistrationService],
    }).compile();

    service = module.get<LeagueRegistrationService>(LeagueRegistrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
