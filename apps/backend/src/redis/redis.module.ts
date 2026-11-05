import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { KeyValueStore, type Window } from './key-value-store.js';

export const REDIS = Symbol('REDIS');

class RedisKeyValueStore extends KeyValueStore {
  constructor(private readonly redis: Redis) {
    super();
  }

  async increment(key: string, windowSeconds: number): Promise<Window> {
    const results = await this.redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds, 'NX')
      .ttl(key)
      .exec();
    if (!results) throw new Error(`redis transaction aborted for ${key}`);
    return {
      count: Number(results[0][1]),
      resetIn: Math.max(0, Number(results[2][1])),
    };
  }

  async peek(key: string): Promise<Window> {
    const [value, ttl] = await Promise.all([
      this.redis.get(key),
      this.redis.ttl(key),
    ]);
    return { count: Number(value ?? 0), resetIn: Math.max(0, ttl) };
  }

  get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async delete(key: string) {
    await this.redis.del(key);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), {
          maxRetriesPerRequest: 2,
        }),
    },
    {
      provide: KeyValueStore,
      inject: [REDIS],
      useFactory: (redis: Redis) => new RedisKeyValueStore(redis),
    },
  ],
  exports: [KeyValueStore],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
