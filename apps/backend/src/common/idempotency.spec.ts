import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ErrorCode } from '@nezfocus/shared';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '../redis/key-value-store.js';
import { AppError } from './app-error.js';
import { IdempotencyInterceptor } from './idempotency.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };

function call(
  interceptor: IdempotencyInterceptor,
  {
    key,
    body,
    userId = 1n,
    status = 201,
    handle = () => of({ id: String(Math.random()) }),
  }: {
    key?: string;
    body: unknown;
    userId?: bigint;
    status?: number;
    handle?: CallHandler['handle'];
  },
) {
  const res = {
    statusCode: status,
    status: (s: number) => (res.statusCode = s),
  };
  const req = {
    method: 'POST',
    originalUrl: '/api/v1/things',
    body,
    user: { userId },
    header: (name: string) =>
      name.toLowerCase() === 'idempotency-key' ? key : undefined,
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return {
    res,
    run: async () =>
      firstValueFrom(await interceptor.intercept(ctx, { handle })),
  };
}

const errorCode = (p: Promise<unknown>) =>
  p.then(
    () => 'resolved',
    (e: unknown) => (e instanceof AppError ? e.code : e),
  );

describe('IdempotencyInterceptor (REQ-MSG-09)', () => {
  it('replays the first result and status for the same key and body', async () => {
    const i = new IdempotencyInterceptor(new MemoryKeyValueStore(clock));
    const first = await call(i, { key: 'k1', body: { a: 1 } }).run();
    const again = call(i, { key: 'k1', body: { a: 1 }, status: 200 });
    expect(await again.run()).toEqual(first);
    expect(again.res.statusCode).toBe(201);
  });

  it('AC2: the same key with another body is 40907', async () => {
    const i = new IdempotencyInterceptor(new MemoryKeyValueStore(clock));
    await call(i, { key: 'k1', body: { a: 1 } }).run();
    expect(await errorCode(call(i, { key: 'k1', body: { a: 2 } }).run())).toBe(
      ErrorCode.IdempotencyKeyReused,
    );
  });

  it('keys are per user', async () => {
    const i = new IdempotencyInterceptor(new MemoryKeyValueStore(clock));
    const first = await call(i, { key: 'k1', body: {} }).run();
    const other = await call(i, { key: 'k1', body: {}, userId: 2n }).run();
    expect(other).not.toEqual(first);
  });

  it('a duplicate while the first is still running is 40907', async () => {
    const store = new MemoryKeyValueStore(clock);
    const i = new IdempotencyInterceptor(store);
    await store.setIfAbsent('idem:1:k1', 'running', 60);
    expect(await errorCode(call(i, { key: 'k1', body: {} }).run())).toBe(
      ErrorCode.IdempotencyKeyReused,
    );
  });

  it('a failed request frees the key, so a retry runs again', async () => {
    const i = new IdempotencyInterceptor(new MemoryKeyValueStore(clock));
    const failing = call(i, {
      key: 'k1',
      body: {},
      handle: () => throwError(() => new Error('boom')),
    });
    await expect(failing.run()).rejects.toThrow('boom');
    expect(await call(i, { key: 'k1', body: {} }).run()).toHaveProperty('id');
  });

  it('no header: runs as usual; a bad header is 40001', async () => {
    const i = new IdempotencyInterceptor(new MemoryKeyValueStore(clock));
    expect(await call(i, { body: {} }).run()).toHaveProperty('id');
    expect(
      await errorCode(call(i, { key: 'x'.repeat(65), body: {} }).run()),
    ).toBe(ErrorCode.ValidationError);
  });
});
