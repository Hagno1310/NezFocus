import { ErrorCode } from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';

export type ActionFailure =
  | { kind: 'max-reactions' | 'max-pins' | 'not-allowed' | 'deleted' }
  | { kind: 'too-fast'; seconds: number }
  | { kind: 'offline' } // no answer at all
  | { kind: 'failed' }; // an answer with a code nothing else here covers

// S-HOME-04 › Tương tác and 10 S-MOD-04 "Toast chung theo mã", for every action on a message.
export function actionFailure(err: unknown): ActionFailure {
  const e = asApiError(err);
  if (!e) return { kind: 'offline' };
  switch (e.code) {
    case ErrorCode.MaxReactionsReached:
      return { kind: 'max-reactions' };
    // REQ-MSG-10 AC2.
    case ErrorCode.MaxPinsReached:
      return { kind: 'max-pins' };
    case ErrorCode.Forbidden:
    case ErrorCode.CannotMessageUser:
      return { kind: 'not-allowed' };
    case ErrorCode.RateLimited:
      return {
        kind: 'too-fast',
        seconds: Math.max(1, Math.ceil(e.retry_after ?? 1)),
      };
    case ErrorCode.NotFound:
      return { kind: 'deleted' };
    default:
      return { kind: 'failed' };
  }
}
