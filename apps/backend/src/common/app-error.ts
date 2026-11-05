import { ErrorCode } from '@nezfocus/shared';

// HTTP status = code / 100, except the codes SRS 11.1 maps differently.
const STATUS_OVERRIDES: Partial<Record<ErrorCode, number>> = {
  40010: 409,
  40011: 403,
  40012: 403,
  40013: 413,
  40014: 415,
  40015: 403,
  40018: 409,
  40019: 422,
  40029: 429,
  40030: 429,
  40041: 410,
  40051: 403,
  40052: 403,
  40053: 403,
};

export const httpStatusOf = (code: ErrorCode) =>
  STATUS_OVERRIDES[code] ?? Math.floor(code / 100);

export type FieldErrors = Record<string, { code: string; message: string }[]>;

// Optional SRS 5.2 / 11.1 extras: retry_after (40029, also sent as Retry-After),
// attempts_left (40003), reason (40100 / 40103).
export type AppErrorDetails = {
  retryAfter?: number;
  attemptsLeft?: number;
  reason?: string;
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly errors?: FieldErrors,
    readonly details: AppErrorDetails = {},
  ) {
    super(message);
  }

  get status() {
    return httpStatusOf(this.code);
  }
}

export const rateLimited = (retryAfter: number) =>
  new AppError(ErrorCode.RateLimited, 'Too many requests', undefined, {
    retryAfter: Math.max(1, Math.ceil(retryAfter)),
  });
