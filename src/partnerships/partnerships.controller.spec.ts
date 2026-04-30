import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipsController } from './partnerships.controller';
import { PartnershipsService } from './partnerships.service';

describe('PartnershipsController', () => {
  let controller: PartnershipsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnershipsController],
      providers: [PartnershipsService],
    }).compile();

    controller = module.get<PartnershipsController>(PartnershipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
