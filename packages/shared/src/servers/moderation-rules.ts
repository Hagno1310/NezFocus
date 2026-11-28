// REQ-ROLE-05 (v1.7): the six timeout levels of S-SET-03 `timeout-sheet`, 1 giờ chosen first.
export const TIMEOUT_LEVELS = [
  { key: '60s', ms: 60_000 },
  { key: '5m', ms: 5 * 60_000 },
  { key: '10m', ms: 10 * 60_000 },
  { key: '1h', ms: 60 * 60_000 },
  { key: '1d', ms: 24 * 60 * 60_000 },
  { key: '1w', ms: 7 * 24 * 60 * 60_000 },
] as const;
export type TimeoutLevel = (typeof TIMEOUT_LEVELS)[number]['key'];
export const DEFAULT_TIMEOUT_LEVEL: TimeoutLevel = '1h';

// REQ-ROLE-05: a timeout lasts 60 seconds to 28 days; the API takes any end in between.
export const TIMEOUT_MIN_MS = 60_000;
export const TIMEOUT_MAX_MS = 28 * 24 * 60 * 60_000;

export const isTimedOut = (
  timeoutUntil: string | null | undefined,
  now: number,
) => !!timeoutUntil && Date.parse(timeoutUntil) > now;
