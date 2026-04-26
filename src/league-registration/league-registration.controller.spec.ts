import { Test, TestingModule } from '@nestjs/testing';
import { LeagueRegistrationController } from './league-registration.controller';
import { LeagueRegistrationService } from './league-registration.service';

describe('LeagueRegistrationController', () => {
  let controller: LeagueRegistrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeagueRegistrationController],
      providers: [LeagueRegistrationService],
    }).compile();

    controller = module.get<LeagueRegistrationController>(LeagueRegistrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
