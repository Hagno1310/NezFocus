import type { PresenceStatus } from '@nezfocus/shared';

// S-ME-02 `status-sheet`: the four manual statuses, top to bottom (REQ-AUTH-05).
export const MY_STATUSES = [
  'online',
  'idle',
  'dnd',
  'invisible',
] as const satisfies readonly PresenceStatus[];

// The dot on my own avatar: Ẩn looks offline, as others see it (AUTH-05 AC2, S-ME-02 `invisible`).
export const myDot = (status: PresenceStatus) =>
  status === 'invisible' ? ('offline' as const) : status;
