import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { LevelService } from './level.service';

describe('LevelService XP logic', () => {
  let service: LevelService;

  const playerLevelModelMock: any = {
    findOne: jest.fn(),
  };

  const processedXpEventModelMock: any = {
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    processedXpEventModelMock.deleteOne.mockReturnValue({
      exec: () => Promise.resolve({}),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelService,
        { provide: 'PlayerLevelModel', useValue: playerLevelModelMock },
        {
          provide: 'ProcessedXpEventModel',
          useValue: processedXpEventModelMock,
        },
      ],
    })
      .overrideProvider(LevelService)
      .useValue(
        new LevelService(playerLevelModelMock, processedXpEventModelMock),
      )
      .compile();

    service = module.get<LevelService>(LevelService);
  });

  function createPlayerDoc(initial: {
    level: number;
    currentXP: number;
    totalXP: number;
  }) {
    const doc: any = {
      user: new Types.ObjectId(),
      level: initial.level,
      currentXP: initial.currentXP,
      totalXP: initial.totalXP,
      save: jest.fn().mockResolvedValue(undefined),
    };
    return doc;
  }

  function mockFindOnePlayer(playerDoc: any) {
    playerLevelModelMock.findOne.mockReturnValue({
      exec: () => Promise.resolve(playerDoc),
    });
  }

  it('1) addXP simple sans level-up', async () => {
    const userId = new Types.ObjectId().toHexString();
    const xpToNext = service.computeXpToNext(1);
    const amount = Math.floor(xpToNext / 2);

    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });
    mockFindOnePlayer(playerDoc);
    processedXpEventModelMock.create.mockResolvedValueOnce({});

    const result = await service.addXP(userId, amount, 'MANUAL', 'event-1');

    expect(result).not.toBeNull();
    expect(result!.oldLevel).toBe(1);
    expect(result!.newLevel).toBe(1);
    expect(result!.levelUpCount).toBe(0);
    expect(result!.newCurrentXP).toBe(amount);
    expect(result!.newTotalXP).toBe(amount);
  });

  it('2) addXP avec 1 level-up', async () => {
    const userId = new Types.ObjectId().toHexString();
    const xpToNext = service.computeXpToNext(1);
    const amount = xpToNext + 10;

    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });
    mockFindOnePlayer(playerDoc);
    processedXpEventModelMock.create.mockResolvedValueOnce({});

    const result = await service.addXP(userId, amount, 'MANUAL', 'event-2');

    expect(result).not.toBeNull();
    expect(result!.oldLevel).toBe(1);
    expect(result!.newLevel).toBe(2);
    expect(result!.levelUpCount).toBe(1);
    expect(result!.newCurrentXP).toBe(10);
    expect(result!.newTotalXP).toBe(amount);
  });

  it('3) addXP avec multi-level-up', async () => {
    const userId = new Types.ObjectId().toHexString();
    const xp1 = service.computeXpToNext(1);
    const xp2 = service.computeXpToNext(2);
    const xp3 = service.computeXpToNext(3);

    const total = xp1 + xp2 + xp3 + 50;

    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });
    mockFindOnePlayer(playerDoc);
    processedXpEventModelMock.create.mockResolvedValueOnce({});

    const result = await service.addXP(userId, total, 'MANUAL', 'event-3');

    expect(result).not.toBeNull();
    expect(result!.oldLevel).toBe(1);
    expect(result!.newLevel).toBe(4);
    expect(result!.levelUpCount).toBe(3);
    expect(result!.newCurrentXP).toBe(50);
    expect(result!.newTotalXP).toBe(total);
  });

  it('4) idempotence: même eventId appliqué 2 fois -> pas de double XP', async () => {
    const userId = new Types.ObjectId().toHexString();
    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });

    mockFindOnePlayer(playerDoc);
    processedXpEventModelMock.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        Object.assign(new Error('duplicate'), { code: 11000 }),
      );

    const r1 = await service.addXP(userId, 100, 'MANUAL', 'duplicate-event');
    const r2 = await service.addXP(userId, 100, 'MANUAL', 'duplicate-event');

    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
    expect(playerDoc.totalXP).toBe(100);
  });

  it('5) deux events séquentiels -> total cohérent', async () => {
    const userId = new Types.ObjectId().toHexString();
    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });

    mockFindOnePlayer(playerDoc);
    processedXpEventModelMock.create.mockResolvedValue({});

    await service.addXP(userId, 80, 'MANUAL', 'event-concurrent-1');
    await service.addXP(userId, 90, 'MANUAL', 'event-concurrent-2');

    expect(playerDoc.totalXP).toBe(170);
  });
});
