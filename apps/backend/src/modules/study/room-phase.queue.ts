import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import {
  EMPTY_ROOM_MS,
  RoomScheduler,
  RoomSessionService,
} from './room-session.service.js';

const QUEUE = 'room-phase';
type RoomJob = { id: string; since?: number };

// SRS 7.3.6: one delayed job at each phase_ends_at; STUDY-01 AC7: one 5 minutes after the room empties.
@Injectable()
export class BullRoomScheduler
  extends RoomScheduler
  implements OnApplicationShutdown
{
  private readonly queue: Queue<RoomJob>;

  constructor(config: ConfigService) {
    super();
    this.queue = new Queue<RoomJob>(QUEUE, {
      connection: { url: config.getOrThrow<string>('REDIS_URL') },
    });
  }

  // Same session and moment = same job; a stale one (after pause or skip) finds nothing to do.
  async tick(sessionId: bigint, at: Date) {
    await this.add('tick', { id: sessionId.toString() }, at, at.getTime());
  }

  async emptyCheck(sessionId: bigint, since: Date) {
    const data = { id: sessionId.toString(), since: since.getTime() };
    await this.add(
      'empty',
      data,
      new Date(since.getTime() + EMPTY_ROOM_MS),
      since.getTime(),
    );
  }

  private async add(name: string, data: RoomJob, at: Date, key: number) {
    await this.queue.add(name, data, {
      jobId: `${data.id}-${name}-${key}`,
      delay: Math.max(0, at.getTime() - Date.now()),
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  async onApplicationShutdown() {
    await this.queue.close();
  }
}

@Injectable()
export class RoomPhaseWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('RoomPhaseWorker');
  private worker?: Worker<RoomJob>;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: RoomSessionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<RoomJob>(
      QUEUE,
      (job) =>
        job.name === 'empty'
          ? this.sessions.emptyCheck(
              BigInt(job.data.id),
              new Date(job.data.since!),
            )
          : this.sessions.tick(BigInt(job.data.id)),
      {
        connection: { url: this.config.getOrThrow<string>('REDIS_URL') },
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`${job?.name} ${job?.data.id} failed: ${err.message}`),
    );
  }

  async onApplicationShutdown() {
    await this.worker?.close();
  }
}
