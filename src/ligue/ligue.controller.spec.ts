import { Test, TestingModule } from '@nestjs/testing';
import { LigueController } from './ligue.controller';
import { LigueService } from './ligue.service';

describe('LigueController', () => {
  let controller: LigueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LigueController],
      providers: [LigueService],
    }).compile();

    controller = module.get<LigueController>(LigueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
