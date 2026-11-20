import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { addFriendError, mutualLine, primaryAction } from './addFriend';

const s = (name: string) => ({ id: name, name });

describe('S-DM-05 Thêm bạn (REQ-FRIEND-01)', () => {
  it('server line: one, two, more, none', () => {
    expect(mutualLine([s('Ôn thi Giải tích 2')])).toEqual({
      key: 'mutualOne',
      params: { a: 'Ôn thi Giải tích 2' },
    });
    expect(mutualLine([s('A'), s('B')])).toEqual({
      key: 'mutualTwo',
      params: { a: 'A', b: 'B' },
    });
    expect(mutualLine([s('A'), s('B'), s('C')])).toEqual({
      key: 'mutualMore',
      params: { a: 'A', count: 2 },
    });
    expect(mutualLine([])).toEqual({ key: 'mutualNone', params: {} });
  });

  it('main button by relationship: send, accept, or disabled send (AC6)', () => {
    expect(primaryAction('none')).toEqual({ kind: 'send', enabled: true });
    expect(primaryAction('incoming')).toEqual({
      kind: 'accept',
      enabled: true,
    });
    for (const r of ['friend', 'outgoing', 'blocked'] as const)
      expect(primaryAction(r)).toEqual({ kind: 'send', enabled: false });
  });

  it('errors under the field, by code and step', () => {
    const e = (code: number, retry_after: number | null = null) => ({
      code,
      retry_after,
    });
    expect(addFriendError(e(ErrorCode.NotFound), 'lookup')).toEqual({
      key: 'notFound',
    });
    expect(addFriendError(e(ErrorCode.RateLimited, 42), 'lookup')).toEqual({
      key: 'lookupLimited',
      seconds: 42,
    });
    expect(addFriendError(e(ErrorCode.RateLimited, 3600), 'send')).toEqual({
      key: 'dailyLimit',
      seconds: 3600,
    });
    expect(addFriendError(e(ErrorCode.CannotMessageUser), 'send')).toEqual({
      key: 'cannotSend',
    });
    expect(
      addFriendError(e(ErrorCode.FriendRequestAlreadyPending), 'send'),
    ).toEqual({ key: 'alreadySent' });
    expect(addFriendError(e(ErrorCode.AlreadyFriends), 'send')).toEqual({
      key: 'alreadyFriends',
    });
    expect(addFriendError(e(ErrorCode.InternalError), 'send')).toEqual({
      key: 'generic',
    });
  });
});
