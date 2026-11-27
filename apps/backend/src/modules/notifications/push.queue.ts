import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { deliver, PushSender, type PushJob } from './push-sender.js';
import { PushTokensRepository } from './push-tokens.repository.js';

const QUEUE = 'push';

export abstract class PushQueue {
  abstract add(jobs: PushJob[]): Promise<void>;
}

// REQ-NOTIF-02 AC1: one job per device token, sent right away; a failed send is retried
// (3 tries, 1 s then 2 s) while the push is still worth showing.
@Injectable()
export class BullPushQueue extends PushQueue implements OnApplicationShutdown {
  private readonly queue: Queue<PushJob>;

  constructor(config: ConfigService) {
    super();
    this.queue = new Queue<PushJob>(QUEUE, {
      connection: { url: config.getOrThrow<string>('REDIS_URL') },
    });
  }

  async add(jobs: PushJob[]) {
    await this.queue.addBulk(
      jobs.map((data) => ({
        name: data.payload.type,
        data,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      })),
    );
  }

  async onApplicationShutdown() {
    await this.queue.close();
  }
}

@Injectable()
export class PushWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('PushWorker');
  private worker?: Worker<PushJob>;

  constructor(
    private readonly config: ConfigService,
    private readonly sender: PushSender,
    private readonly tokens: PushTokensRepository,
  ) {}

  onModuleInit() {
    this.worker = new Worker<PushJob>(
      QUEUE,
      (job) => deliver(job.data, this.sender, this.tokens),
      {
        connection: { url: this.config.getOrThrow<string>('REDIS_URL') },
        concurrency: 20,
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`push ${job?.name} failed: ${err.message}`),
    );
  }

  async onApplicationShutdown() {
    await this.worker?.close();
  }
}
