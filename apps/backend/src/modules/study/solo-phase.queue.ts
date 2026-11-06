import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { SoloScheduler, SoloSessionService } from './solo-session.service.js';

const QUEUE = 'solo-phase';
type TickJob = { id: string };

// SRS 7.3.6: one delayed job at each phase_ends_at (and at the end of the 10-minute wait).
@Injectable()
export class BullSoloScheduler
  extends SoloScheduler
  implements OnApplicationShutdown
{
  private readonly queue: Queue<TickJob>;

  constructor(config: ConfigService) {
    super();
    this.queue = new Queue<TickJob>(QUEUE, {
      connection: { url: config.getOrThrow<string>('REDIS_URL') },
    });
  }

  async schedule(sessionId: bigint, at: Date) {
    await this.queue.add(
      'tick',
      { id: sessionId.toString() },
      {
        // Same session and moment = same job; a stale one (after pause or skip) finds nothing to do.
        jobId: `${sessionId}-${at.getTime()}`,
        delay: Math.max(0, at.getTime() - Date.now()),
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async onApplicationShutdown() {
    await this.queue.close();
  }
}

@Injectable()
export class SoloPhaseWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('SoloPhaseWorker');
  private worker?: Worker<TickJob>;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SoloSessionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<TickJob>(
      QUEUE,
      (job) => this.sessions.tick(BigInt(job.data.id)),
      {
        connection: { url: this.config.getOrThrow<string>('REDIS_URL') },
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`tick ${job?.data.id} failed: ${err.message}`),
    );
  }

  async onApplicationShutdown() {
    await this.worker?.close();
  }
}
