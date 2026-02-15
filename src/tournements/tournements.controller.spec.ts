import { Test, TestingModule } from '@nestjs/testing';
import { TournementsController } from './tournements.controller';
import { TournementsService } from './tournements.service';

describe('TournementsController', () => {
  let controller: TournementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournementsController],
      providers: [TournementsService],
    }).compile();

    controller = module.get<TournementsController>(TournementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
