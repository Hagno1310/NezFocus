import {
  ErrorCode,
  type LookupRelationship,
  type UserLookupResponse,
} from '@nezfocus/shared';

// S-DM-05 › Nội dung chữ, dòng server chung.
export function mutualLine(servers: UserLookupResponse['mutual_servers']) {
  const [a, b] = servers;
  if (!a) return { key: 'mutualNone' as const, params: {} };
  if (!b) return { key: 'mutualOne' as const, params: { a: a.name } };
  if (servers.length === 2)
    return { key: 'mutualTwo' as const, params: { a: a.name, b: b.name } };
  return {
    key: 'mutualMore' as const,
    params: { a: a.name, count: servers.length - 1 },
  };
}

// REQ-FRIEND-01 v1.9: an existing relationship shows on the card instead of failing on send (AC6).
export function primaryAction(r: LookupRelationship) {
  if (r === 'incoming') return { kind: 'accept' as const, enabled: true };
  return { kind: 'send' as const, enabled: r === 'none' };
}

export type AddFriendErrorKey =
  | 'notFound'
  | 'lookupLimited'
  | 'dailyLimit'
  | 'cannotSend'
  | 'alreadySent'
  | 'alreadyFriends'
  | 'generic';

// S-DM-05 › Lỗi dưới ô username. 40029 means the lookup limit on "Tìm", the 50 / day limit on send.
export function addFriendError(
  err: { code: number; retry_after: number | null },
  step: 'lookup' | 'send',
): { key: AddFriendErrorKey; seconds?: number } {
  switch (err.code) {
    case ErrorCode.NotFound:
      return { key: 'notFound' };
    case ErrorCode.RateLimited:
      return {
        key: step === 'lookup' ? 'lookupLimited' : 'dailyLimit',
        seconds: err.retry_after ?? 60,
      };
    case ErrorCode.CannotMessageUser:
      return { key: 'cannotSend' };
    case ErrorCode.FriendRequestAlreadyPending:
      return { key: 'alreadySent' };
    case ErrorCode.AlreadyFriends:
      return { key: 'alreadyFriends' };
    default:
      return { key: 'generic' };
  }
}
