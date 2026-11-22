import type { Clock } from '../common/clock.js';

export type Window = { count: number; resetIn: number };
export type SlidingWindow = { key: string; limit: number; windowMs: number };

// The slice of Redis that counters and short-lived values need (SRS 8.1).
// Abstract class = DI token; unit tests use MemoryKeyValueStore.
export abstract class KeyValueStore {
  // +1; the first hit opens a window of `windowSeconds`. resetIn = seconds until the window closes.
  abstract increment(key: string, windowSeconds: number): Promise<Window>;
  // -1 on a live counter, keeping its window; no-op when the key is gone.
  abstract decrement(key: string): Promise<void>;
  abstract peek(key: string): Promise<Window>;
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;
  // SET NX: false when the key already holds a live value.
  abstract setIfAbsent(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  abstract delete(key: string): Promise<void>;
  // Sliding-window log (REQ-MSG-08): records one hit in every window when all have room and
  // returns 0; otherwise records nothing and returns the ms until each window has room.
  abstract hitWindows(windows: readonly SlidingWindow[]): Promise<number>;
}

export class MemoryKeyValueStore extends KeyValueStore {
  private readonly entries = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor(private readonly clock: Pick<Clock, 'now'>) {
    super();
  }

  private live(key: string) {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= this.clock.now().getTime()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private resetIn(expiresAt: number) {
    return Math.ceil((expiresAt - this.clock.now().getTime()) / 1000);
  }

  async increment(key: string, windowSeconds: number): Promise<Window> {
    const entry = this.live(key) ?? {
      value: '0',
      expiresAt: this.clock.now().getTime() + windowSeconds * 1000,
    };
    entry.value = String(Number(entry.value) + 1);
    this.entries.set(key, entry);
    return {
      count: Number(entry.value),
      resetIn: this.resetIn(entry.expiresAt),
    };
  }

  async decrement(key: string) {
    const entry = this.live(key);
    if (entry) entry.value = String(Number(entry.value) - 1);
  }

  async peek(key: string): Promise<Window> {
    const entry = this.live(key);
    return entry
      ? { count: Number(entry.value), resetIn: this.resetIn(entry.expiresAt) }
      : { count: 0, resetIn: 0 };
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.entries.set(key, {
      value,
      expiresAt: this.clock.now().getTime() + ttlSeconds * 1000,
    });
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    if (this.live(key)) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }

  async delete(key: string) {
    this.entries.delete(key);
  }

  private readonly logs = new Map<string, number[]>();

  async hitWindows(windows: readonly SlidingWindow[]) {
    const now = this.clock.now().getTime();
    let wait = 0;
    for (const w of windows) {
      const log = (this.logs.get(w.key) ?? []).filter(
        (t) => t > now - w.windowMs,
      );
      this.logs.set(w.key, log);
      if (log.length >= w.limit)
        wait = Math.max(wait, log[0]! + w.windowMs - now);
    }
    if (wait) return wait;
    for (const w of windows) this.logs.get(w.key)!.push(now);
    return 0;
  }
}
