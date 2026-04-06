import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { HighlightsService } from '../highlights.service';
import {
  HIGHLIGHT_QUEUE_NAME,
  HighlightJobPayload,
} from './highlight-job.types';

@Injectable()
export class HighlightBullmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HighlightBullmqService.name);
  private redis: IORedis | null = null;
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly highlightsService: HighlightsService,
  ) {}

  onModuleInit(): void {
    const queueEnabled =
      this.configService.get<string>('HIGHLIGHT_QUEUE_ENABLED', 'true') !==
      'false';
    if (!queueEnabled) {
      this.logger.warn(
        'HIGHLIGHT_QUEUE_ENABLED=false: highlight queue is off (no Redis). Set HIGHLIGHT_QUEUE_ENABLED=true and run Redis to enqueue highlight jobs.',
      );
      return;
    }

    this.redis = this.createRedis();
    this.queue = new Queue(HIGHLIGHT_QUEUE_NAME, { connection: this.redis });

    const workerEnabled =
      this.configService.get<string>('HIGHLIGHT_WORKER_ENABLED', 'true') !==
      'false';
    if (!workerEnabled) {
      this.logger.warn(
        'HIGHLIGHT_WORKER_ENABLED=false: jobs can be enqueued but will not be processed on this instance',
      );
      return;
    }

    this.worker = new Worker(
      HIGHLIGHT_QUEUE_NAME,
      async (job) => {
        const { videoId, uploaderId, visibility } =
          job.data as HighlightJobPayload;
        await this.highlightsService.processVideoById(videoId, uploaderId, {
          visibility,
        });
      },
      { connection: this.redis },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Highlight job ${job?.id} failed: ${err?.message ?? err}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async enqueueProcessHighlights(
    payload: HighlightJobPayload,
  ): Promise<{ jobId: string | undefined }> {
    if (!this.queue) {
      throw new Error(
        'Highlight queue is not initialized (HIGHLIGHT_QUEUE_ENABLED=false or Redis / REDIS_URL)',
      );
    }
    const job = await this.queue.add('processHighlight', payload, {
      removeOnComplete: 100,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return { jobId: job.id?.toString() };
  }

  private createRedis(): IORedis {
    const baseOpts = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    } as const;

    const url = this.configService.get<string>('REDIS_URL');
    const redis = url?.trim()
      ? new IORedis(url, { ...baseOpts })
      : new IORedis({
          host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
          port: Number(
            this.configService.get<string>('REDIS_PORT', '6379') || 6379,
          ),
          password:
            this.configService.get<string>('REDIS_PASSWORD') || undefined,
          ...baseOpts,
        });

    let lastErrLogMs = 0;
    redis.on('error', (err: Error) => {
      const now = Date.now();
      if (now - lastErrLogMs > 30_000) {
        this.logger.warn(
          `Redis connection error: ${err.message} (further errors throttled to one log per 30s until connected)`,
        );
        lastErrLogMs = now;
      }
    });

    return redis;
  }
}
