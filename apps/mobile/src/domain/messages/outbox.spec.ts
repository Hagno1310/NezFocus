import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  OUTBOX_EXPIRY_MS,
  afterFailure,
  backoffMs,
  classifySendError,
  isDue,
  type OutboxEntry,
} from './outbox';

const NOW = Date.UTC(2026, 10, 19, 13, 0);
const entry = (over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  nonce: 'n1',
  channelId: '1',
  serverId: '9',
  content: 'Chào cả nhóm',
  replyToId: null,
  attachments: [],
  status: 'pending',
  attempts: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: NOW,
  queuedAt: NOW,
  ...over,
});

describe('classifySendError (MSG-09 AC1, MSG-08 AC1)', () => {
  it('no answer, a timeout or a 5xx is the network: retry', () => {
    expect(classifySendError(new TypeError('Network request failed'))).toEqual({
      kind: 'network',
    });
    expect(classifySendError({ status: 503, code: 50301 })).toEqual({
      kind: 'network',
    });
  });

  it('40029 waits Retry-After; another 4xx is refused for good', () => {
    expect(
      classifySendError({
        status: 429,
        code: ErrorCode.RateLimited,
        retry_after: 12,
      }),
    ).toEqual({ kind: 'rate-limited', retryAfterSeconds: 12 });
    expect(classifySendError({ status: 403, code: 40302 })).toEqual({
      kind: 'refused',
      code: 40302,
    });
  });
});

describe('backoffMs', () => {
  it('doubles from 1 s, capped at 30 s, with jitter in the upper half', () => {
    expect(backoffMs(0, () => 0)).toBe(500);
    expect(backoffMs(0, () => 1)).toBe(1000);
    expect(backoffMs(2, () => 1)).toBe(4000);
    expect(backoffMs(10, () => 1)).toBe(30_000);
  });
});

describe('afterFailure (8.4.5)', () => {
  it('network → retrying with the same nonce and a later attempt', () => {
    const next = afterFailure(entry(), { kind: 'network' }, NOW, () => 1);
    expect(next).toEqual({
      status: 'retrying',
      attempts: 1,
      nextAttemptAt: NOW + 1000,
      lastError: null,
    });
  });

  it('40029 → failed, sent again by itself after exactly Retry-After', () => {
    expect(
      afterFailure(
        entry(),
        { kind: 'rate-limited', retryAfterSeconds: 30 },
        NOW,
      ),
    ).toEqual({
      status: 'failed',
      attempts: 1,
      nextAttemptAt: NOW + 30_000,
      lastError: '40029',
    });
  });

  it('a refused message fails and waits for the user', () => {
    expect(
      afterFailure(entry(), { kind: 'refused', code: 40302 }, NOW),
    ).toMatchObject({
      status: 'failed',
      nextAttemptAt: null,
      lastError: '40302',
    });
  });

  it('after 24 hours in the queue it fails, whatever the error', () => {
    const old = entry({ queuedAt: NOW - OUTBOX_EXPIRY_MS - 1 });
    expect(afterFailure(old, { kind: 'network' }, NOW)).toMatchObject({
      status: 'failed',
      nextAttemptAt: null,
      lastError: 'expired',
    });
  });
});

describe('isDue', () => {
  it('pending now; retrying and rate-limited once their time comes; failed never', () => {
    expect(isDue(entry(), NOW)).toBe(true);
    const later = { nextAttemptAt: NOW + 1000 };
    expect(isDue(entry({ status: 'retrying', ...later }), NOW)).toBe(false);
    expect(isDue(entry({ status: 'retrying', ...later }), NOW + 1000)).toBe(
      true,
    );
    expect(isDue(entry({ status: 'failed', ...later }), NOW + 1000)).toBe(true);
    expect(isDue(entry({ status: 'failed' }), NOW + 1000)).toBe(false);
  });
});
