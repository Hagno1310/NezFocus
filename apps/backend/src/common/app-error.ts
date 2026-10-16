import { ErrorCode } from '@nezfocus/shared';

// HTTP status = code / 100, except the codes SRS 11.1 maps differently.
const STATUS_OVERRIDES: Partial<Record<ErrorCode, number>> = {
  40010: 409,
  40011: 403,
  40012: 403,
  40013: 413,
  40014: 415,
  40015: 403,
  40029: 429,
  40030: 429,
  40041: 410,
  40051: 403,
  40052: 403,
  40053: 403,
};

export const httpStatusOf = (code: ErrorCode) =>
  STATUS_OVERRIDES[code] ?? Math.floor(code / 100);

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly errors?: Record<string, { code: string; message: string }[]>,
  ) {
    super(message);
  }

  get status() {
    return httpStatusOf(this.code);
  }
}
