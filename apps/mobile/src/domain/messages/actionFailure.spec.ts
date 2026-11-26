import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { actionFailure } from './actionFailure';

const api = (code: number, over: object = {}) =>
  Object.assign(new Error('x'), { code, ...over });

describe('actionFailure: the Toast for a failed message action (S-HOME-04, 10 S-MOD-04)', () => {
  it('maps the known codes', () => {
    expect(actionFailure(api(ErrorCode.MaxReactionsReached))).toEqual({
      kind: 'max-reactions',
    });
    expect(actionFailure(api(ErrorCode.MaxPinsReached))).toEqual({
      kind: 'max-pins',
    });
    expect(actionFailure(api(ErrorCode.Forbidden))).toEqual({
      kind: 'not-allowed',
    });
    expect(actionFailure(api(ErrorCode.CannotMessageUser))).toEqual({
      kind: 'not-allowed',
    });
    expect(
      actionFailure(api(ErrorCode.RateLimited, { retry_after: 2.5 })),
    ).toEqual({ kind: 'too-fast', seconds: 3 });
    expect(actionFailure(api(ErrorCode.NotFound))).toEqual({
      kind: 'deleted',
    });
  });

  it('only no answer at all says "no connection"', () => {
    expect(actionFailure(new TypeError('Network request failed'))).toEqual({
      kind: 'offline',
    });
  });

  it('any other answer from the server is a plain failure, not "no connection"', () => {
    expect(actionFailure(api(ErrorCode.InternalError))).toEqual({
      kind: 'failed',
    });
    expect(actionFailure(api(ErrorCode.ValidationError))).toEqual({
      kind: 'failed',
    });
  });
});
