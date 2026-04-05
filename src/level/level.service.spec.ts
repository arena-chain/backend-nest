import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { LevelService, XpEventBase } from './level.service';

describe('LevelService XP logic', () => {
  let service: LevelService;

  const playerLevelModelMock: any = {
    db: {
      startSession: jest.fn().mockResolvedValue({
        withTransaction: async (fn: () => Promise<void>) => {
          await fn();
        },
        endSession: jest.fn(),
      }),
    },
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const processedXpEventModelMock: any = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelService,
        {
          provide: 'PlayerLevelModel',
          useValue: playerLevelModelMock,
        },
        {
          provide: 'ProcessedXpEventModel',
          useValue: processedXpEventModelMock,
        },
      ],
    })
      .overrideProvider(LevelService)
      .useValue(
        new LevelService(
          playerLevelModelMock as any,
          processedXpEventModelMock as any,
        ),
      )
      .compile();

    service = module.get<LevelService>(LevelService);
  });

  function createPlayerDoc(initial: { level: number; currentXP: number; totalXP: number }) {
    return {
      user: new Types.ObjectId(),
      level: initial.level,
      currentXP: initial.currentXP,
      totalXP: initial.totalXP,
      save: jest.fn(),
    };
  }

  it('1) addXP simple sans level-up', async () => {
    const userId = new Types.ObjectId().toHexString();
    const xpToNext = service.computeXpToNext(1);
    const amount = Math.floor(xpToNext / 2);

    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });

    playerLevelModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(playerDoc),
      }),
    });

    processedXpEventModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(null),
      }),
    });

    processedXpEventModelMock.create.mockImplementation(() => Promise.resolve());

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

    playerLevelModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(playerDoc),
      }),
    });

    processedXpEventModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(null),
      }),
    });
    processedXpEventModelMock.create.mockImplementation(() => Promise.resolve());

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

    playerLevelModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(playerDoc),
      }),
    });
    processedXpEventModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(null),
      }),
    });
    processedXpEventModelMock.create.mockImplementation(() => Promise.resolve());

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

    const findOneFirstCall = {
      session: () => ({
        exec: () => Promise.resolve(null),
      }),
    };
    const findOneSecondCall = {
      session: () => ({
        exec: () => Promise.resolve({ eventId: 'duplicate-event' }),
      }),
    };

    let processedCallCount = 0;
    processedXpEventModelMock.findOne.mockImplementation(() => {
      processedCallCount += 1;
      return processedCallCount === 1 ? findOneFirstCall : findOneSecondCall;
    });

    playerLevelModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(playerDoc),
      }),
    });
    processedXpEventModelMock.create.mockImplementation(() => Promise.resolve());

    const r1 = await service.addXP(userId, 100, 'MANUAL', 'duplicate-event');
    const r2 = await service.addXP(userId, 100, 'MANUAL', 'duplicate-event');

    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
    expect(playerDoc.totalXP).toBe(100);
  });

  it('5) concurrence: deux events simultanés -> total cohérent', async () => {
    const userId = new Types.ObjectId().toHexString();
    const playerDoc = createPlayerDoc({ level: 1, currentXP: 0, totalXP: 0 });

    processedXpEventModelMock.findOne.mockReturnValue({
      session: () => ({
        exec: () => Promise.resolve(null),
      }),
    });
    processedXpEventModelMock.create.mockImplementation(() => Promise.resolve());

    let sessionIndex = 0;
    playerLevelModelMock.findOne.mockImplementation(() => ({
      session: () => ({
        exec: async () => {
          sessionIndex += 1;
          return playerDoc;
        },
      }),
    }));

    const p1 = service.addXP(userId, 80, 'MANUAL', 'event-concurrent-1');
    const p2 = service.addXP(userId, 90, 'MANUAL', 'event-concurrent-2');

    await Promise.all([p1, p2]);

    expect(playerDoc.totalXP).toBe(170);
  });
});

