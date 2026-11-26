import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  KeyValueStore,
  type SlidingWindow,
  type Window,
} from './key-value-store.js';

// KEYS = the windows, ARGV = now, member, then limit and window ms per key.
const HIT_WINDOWS = `
local now = tonumber(ARGV[1])
local wait = 0
for i, key in ipairs(KEYS) do
  local limit = tonumber(ARGV[1 + i * 2])
  local ms = tonumber(ARGV[2 + i * 2])
  redis.call('ZREMRANGEBYSCORE', key, '-inf', now - ms)
  if redis.call('ZCARD', key) >= limit then
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    wait = math.max(wait, tonumber(oldest[2]) + ms - now)
  end
end
if wait > 0 then return wait end
for i, key in ipairs(KEYS) do
  redis.call('ZADD', key, now, ARGV[2])
  redis.call('PEXPIRE', key, tonumber(ARGV[2 + i * 2]))
end
return 0`;

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

  async decrement(key: string) {
    // Plain DECR on a missing key would create -1 with no expiry.
    await this.redis.eval(
      "if redis.call('exists', KEYS[1]) == 1 then return redis.call('decr', KEYS[1]) end return 0",
      1,
      key,
    );
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

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    return (await this.redis.set(key, value, 'EX', ttlSeconds, 'NX')) === 'OK';
  }

  async delete(key: string) {
    await this.redis.del(key);
  }

  async hitWindows(windows: readonly SlidingWindow[]) {
    const now = Date.now();
    const member = `${now}:${Math.random()}`;
    return Number(
      await this.redis.eval(
        HIT_WINDOWS,
        windows.length,
        ...windows.map((w) => w.key),
        now,
        member,
        ...windows.flatMap((w) => [w.limit, w.windowMs]),
      ),
    );
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
  // REDIS: for Pub/Sub (gateway, REQ-MSG-07) and sets the voice seats need (voice-seats.ts);
  // everything else goes through KeyValueStore.
  exports: [REDIS, KeyValueStore],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
