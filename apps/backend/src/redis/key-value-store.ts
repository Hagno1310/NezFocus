import type { Clock } from '../common/clock.js';

export type Window = { count: number; resetIn: number };

// The slice of Redis that counters and short-lived values need (SRS 8.1).
// Abstract class = DI token; unit tests use MemoryKeyValueStore.
export abstract class KeyValueStore {
  // +1; the first hit opens a window of `windowSeconds`. resetIn = seconds until the window closes.
  abstract increment(key: string, windowSeconds: number): Promise<Window>;
  abstract peek(key: string): Promise<Window>;
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
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

  async delete(key: string) {
    this.entries.delete(key);
  }
}
