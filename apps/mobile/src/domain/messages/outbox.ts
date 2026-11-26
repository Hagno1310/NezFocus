import { ErrorCode } from '@nezfocus/shared';

// SRS 8.4.5 message outbox (CR-28 #7: messages only). `sent` is not a status: a sent
// message leaves the outbox and lives in the cache.
export type OutboxStatus = 'pending' | 'retrying' | 'failed';

export type OutboxEntry = {
  nonce: string;
  channelId: string;
  serverId: string | null;
  content: string;
  replyToId: string | null; // REQ-MSG-05
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: number | null; // epoch ms
  lastError: string | null; // error code, or 'expired'
  createdAt: number; // flush order
  queuedAt: number; // the 24 hours count from here; "Gửi lại" restarts it (19/11/2026)
};

export const OUTBOX_EXPIRY_MS = 24 * 60 * 60 * 1000;
const BACKOFF_CAP_MS = 30_000;

export type SendFailure =
  | { kind: 'network' }
  | { kind: 'rate-limited'; retryAfterSeconds: number }
  | { kind: 'refused'; code: number };

type ErrorLike = {
  status?: number;
  code?: number;
  retry_after?: number | null;
};

// No status = fetch never got an answer (offline, timeout).
export function classifySendError(err: unknown): SendFailure {
  const e = (err && typeof err === 'object' ? err : {}) as ErrorLike;
  if (e.status === undefined || e.status >= 500) return { kind: 'network' };
  if (e.code === ErrorCode.RateLimited)
    return { kind: 'rate-limited', retryAfterSeconds: e.retry_after ?? 30 };
  return { kind: 'refused', code: e.code ?? e.status };
}

// 1 s, 2 s, 4 s… up to 30 s, the Gateway's curve; jitter keeps a crowd from retrying at once.
export const backoffMs = (attempts: number, random = Math.random) => {
  const base = Math.min(BACKOFF_CAP_MS, 1000 * 2 ** attempts);
  return Math.round(base / 2 + (random() * base) / 2);
};

export function afterFailure(
  entry: OutboxEntry,
  failure: SendFailure,
  now: number,
  random = Math.random,
): Pick<OutboxEntry, 'status' | 'attempts' | 'nextAttemptAt' | 'lastError'> {
  const attempts = entry.attempts + 1;
  if (now - entry.queuedAt > OUTBOX_EXPIRY_MS)
    return {
      status: 'failed',
      attempts,
      nextAttemptAt: null,
      lastError: 'expired',
    };
  switch (failure.kind) {
    case 'network':
      return {
        status: 'retrying',
        attempts,
        nextAttemptAt: now + backoffMs(entry.attempts, random),
        lastError: null,
      };
    // REQ-MSG-08 AC1: shown as failed, sent again by itself after Retry-After.
    case 'rate-limited':
      return {
        status: 'failed',
        attempts,
        nextAttemptAt: now + failure.retryAfterSeconds * 1000,
        lastError: String(ErrorCode.RateLimited),
      };
    case 'refused':
      return {
        status: 'failed',
        attempts,
        nextAttemptAt: null,
        lastError: String(failure.code),
      };
  }
}

// A failed entry with a time set is rate-limited and goes again by itself.
export const isDue = (e: OutboxEntry, now: number) =>
  (e.status !== 'failed' || e.nextAttemptAt !== null) &&
  (e.nextAttemptAt ?? 0) <= now;
