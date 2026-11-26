import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../../redis/redis.module.js';

// Who sits in which voice room. SRS 8.1: voice state lives in Redis, never PostgreSQL.
export type Seat = {
  userId: bigint;
  channelId: bigint;
  serverId: bigint;
  authSessionId: bigint; // the login (device) holding the seat: another one = `other_device`
  selfMute: boolean;
  selfVideo: boolean;
  joinedAt: number; // ms
  awayUntil: number | null; // ms; lost connection, seat kept until then (VC-01, 3 minutes)
};

export abstract class VoiceSeats {
  abstract get(userId: bigint): Promise<Seat | null>;
  // The seat a login (device) holds, if any: signing out leaves the room (VC-01).
  abstract ofLogin(authSessionId: bigint): Promise<Seat | null>;
  abstract put(seat: Seat): Promise<void>;
  // The removed seat, or null when there was none.
  abstract remove(userId: bigint): Promise<Seat | null>;
  abstract inServers(serverIds: readonly bigint[]): Promise<Seat[]>;
  // Users whose away time has run out.
  abstract expired(now: number): Promise<bigint[]>;
}

type Stored = Omit<
  Seat,
  'userId' | 'channelId' | 'serverId' | 'authSessionId'
> & {
  userId: string;
  channelId: string;
  serverId: string;
  authSessionId: string;
};

const store = (s: Seat): string =>
  JSON.stringify({
    ...s,
    userId: s.userId.toString(),
    channelId: s.channelId.toString(),
    serverId: s.serverId.toString(),
    authSessionId: s.authSessionId.toString(),
  } satisfies Stored);

const load = (text: string): Seat => {
  const s = JSON.parse(text) as Stored;
  return {
    ...s,
    userId: BigInt(s.userId),
    channelId: BigInt(s.channelId),
    serverId: BigInt(s.serverId),
    authSessionId: BigInt(s.authSessionId),
  };
};

const seatKey = (userId: bigint) => `voice:seat:${userId}`;
const serverKey = (serverId: bigint) => `voice:server:${serverId}`;
const loginKey = (authSessionId: bigint) => `voice:login:${authSessionId}`;
const AWAY = 'voice:away';

@Injectable()
export class RedisVoiceSeats extends VoiceSeats {
  constructor(@Inject(REDIS) private readonly redis: Redis) {
    super();
  }

  async get(userId: bigint) {
    const text = await this.redis.get(seatKey(userId));
    return text ? load(text) : null;
  }

  async ofLogin(authSessionId: bigint) {
    const userId = await this.redis.get(loginKey(authSessionId));
    const seat = userId ? await this.get(BigInt(userId)) : null;
    return seat?.authSessionId === authSessionId ? seat : null;
  }

  async put(seat: Seat) {
    const old = await this.get(seat.userId);
    const tx = this.redis.multi();
    if (old && old.serverId !== seat.serverId)
      tx.srem(serverKey(old.serverId), seat.userId.toString());
    if (old && old.authSessionId !== seat.authSessionId)
      tx.del(loginKey(old.authSessionId));
    tx.set(loginKey(seat.authSessionId), seat.userId.toString());
    tx.set(seatKey(seat.userId), store(seat));
    tx.sadd(serverKey(seat.serverId), seat.userId.toString());
    if (seat.awayUntil === null) tx.zrem(AWAY, seat.userId.toString());
    else tx.zadd(AWAY, seat.awayUntil, seat.userId.toString());
    await tx.exec();
  }

  async remove(userId: bigint) {
    const seat = await this.get(userId);
    if (!seat) return null;
    await this.redis
      .multi()
      .del(seatKey(userId), loginKey(seat.authSessionId))
      .srem(serverKey(seat.serverId), userId.toString())
      .zrem(AWAY, userId.toString())
      .exec();
    return seat;
  }

  async inServers(serverIds: readonly bigint[]) {
    if (!serverIds.length) return [];
    const users = await this.redis.sunion(...serverIds.map(serverKey));
    if (!users.length) return [];
    const texts = await this.redis.mget(
      ...users.map((u) => seatKey(BigInt(u))),
    );
    return texts.filter((t): t is string => t !== null).map(load);
  }

  async expired(now: number) {
    const users = await this.redis.zrangebyscore(AWAY, 0, now);
    return users.map(BigInt);
  }
}

// Unit tests: the same contract in memory.
export class MemoryVoiceSeats extends VoiceSeats {
  private readonly seats = new Map<bigint, Seat>();

  get(userId: bigint) {
    return Promise.resolve(this.seats.get(userId) ?? null);
  }

  ofLogin(authSessionId: bigint) {
    return Promise.resolve(
      [...this.seats.values()].find((s) => s.authSessionId === authSessionId) ??
        null,
    );
  }

  put(seat: Seat) {
    this.seats.set(seat.userId, { ...seat });
    return Promise.resolve();
  }

  remove(userId: bigint) {
    const seat = this.seats.get(userId) ?? null;
    this.seats.delete(userId);
    return Promise.resolve(seat);
  }

  inServers(serverIds: readonly bigint[]) {
    return Promise.resolve(
      [...this.seats.values()].filter((s) => serverIds.includes(s.serverId)),
    );
  }

  expired(now: number) {
    return Promise.resolve(
      [...this.seats.values()]
        .filter((s) => s.awayUntil !== null && s.awayUntil <= now)
        .map((s) => s.userId),
    );
  }
}
