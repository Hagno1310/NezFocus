import { describe, expect, it } from 'vitest';
import {
  ErrorCode,
  Permission as P,
  type RoleResponse,
  type ServerMember,
} from '@nezfocus/shared';
import {
  moderationErrorOf,
  moderationRows,
  timeoutChip,
  timeoutEnd,
} from './moderation';
import { roleActor } from './roles';

const S = 'srv';
const role = (
  id: string,
  name: string,
  position: number,
  permissions = 0n,
): RoleResponse => ({
  id,
  name,
  position,
  permissions: permissions.toString(),
  is_mentionable: false,
});
// Spec 08: Quản trị (Tuấn) > Trưởng nhóm (Bình, MODERATE_MEMBERS only) > @everyone.
const roles = [
  role(S, '@everyone', 0),
  role('adm', 'Admin', 1, P.ADMINISTRATOR),
  role('tn', 'Trưởng nhóm', 2, P.MODERATE_MEMBERS),
  role(
    'qt',
    'Quản trị',
    3,
    P.KICK_MEMBERS | P.BAN_MEMBERS | P.MODERATE_MEMBERS,
  ),
];
const server = { id: S, owner_id: 'an' };
const member = (
  id: string,
  roleIds: string[] = [],
  timeout: string | null = null,
  reason: string | null = null,
): ServerMember => ({
  user: { id, username: `${id}.x`, display_name: id, avatar: null },
  role_ids: roleIds,
  joined_at: '2026-10-05T03:00:00Z',
  timeout_until: timeout,
  timeout_reason: reason,
});
const NOW = Date.parse('2026-10-18T13:12:00Z'); // 20:12 in Hà Nội
const TZ = 'Asia/Ho_Chi_Minh';
const rowsFor = (
  actorId: string,
  actorRoles: string[],
  target: ServerMember,
) => {
  const actor = roleActor(server, roles, actorId, actorRoles);
  return moderationRows(actor, target, NOW);
};

describe('moderationRows (S-SET-03 KIỂM DUYỆT, S-HOME-10 `moderator`)', () => {
  it('Tuấn on Khánh: Tạm khóa, Mời ra, Cấm', () => {
    expect(rowsFor('tuan', ['qt'], member('khanh'))).toEqual({
      timeout: 'set',
      kick: true,
      ban: true,
    });
  });

  it('each row follows its permission: Bình has MODERATE_MEMBERS only', () => {
    expect(rowsFor('binh', ['tn'], member('khanh'))).toEqual({
      timeout: 'set',
      kick: false,
      ban: false,
    });
  });

  it('`timed-out`: Quân → Đổi thời hạn + Gỡ (running)', () => {
    const quan = member('quan', [], '2026-10-18T14:12:00Z');
    expect(rowsFor('binh', ['tn'], quan).timeout).toBe('running');
    // Ended by the clock: Tạm khóa again.
    const ended = member('quan', [], '2026-10-18T13:00:00Z');
    expect(rowsFor('binh', ['tn'], ended).timeout).toBe('set');
  });

  it('`member-blocked` (AC3): the Owner, a role level or above, oneself → no group', () => {
    const none = { timeout: null, kick: false, ban: false };
    expect(rowsFor('tuan', ['qt'], member('an'))).toEqual(none);
    expect(rowsFor('binh', ['tn'], member('tuan', ['qt']))).toEqual(none);
    expect(rowsFor('tuan', ['qt'], member('tuan', ['qt']))).toEqual(none);
  });

  it('CR-28 #18: an ADMINISTRATOR below me can be kicked, not timed out', () => {
    expect(rowsFor('tuan', ['qt'], member('lan', ['adm']))).toEqual({
      timeout: null,
      kick: true,
      ban: true,
    });
  });

  it('the Owner acts on everyone else', () => {
    expect(rowsFor('an', [], member('tuan', ['qt']))).toEqual({
      timeout: 'set',
      kick: true,
      ban: true,
    });
  });
});

describe('timeoutEnd (`timeout-sheet` "Hết lúc …")', () => {
  it('1 giờ → 21:12 today; 1 ngày → 20:12, 19/10', () => {
    expect(timeoutEnd(NOW, 60 * 60_000, TZ)).toEqual({
      time: '21:12',
      date: null,
    });
    expect(timeoutEnd(NOW, 24 * 60 * 60_000, TZ)).toEqual({
      time: '20:12',
      date: '19/10',
    });
  });
});

describe('timeoutChip (`timed-out`)', () => {
  it('"21:12 · Gửi tin liên tục"; another day "20:12, 19/10"; no reason → the time only', () => {
    expect(
      timeoutChip('2026-10-18T14:12:00Z', 'Gửi tin liên tục', NOW, TZ),
    ).toEqual({
      until: '21:12',
      reason: 'Gửi tin liên tục',
    });
    expect(timeoutChip('2026-10-19T13:12:00Z', null, NOW, TZ)).toEqual({
      until: '20:12, 19/10',
      reason: null,
    });
  });
});

describe('moderationErrorOf', () => {
  it('40301 → hierarchy (the dialog stays, its button off); 40401 → gone; else failed', () => {
    expect(
      moderationErrorOf({ code: ErrorCode.InsufficientRoleHierarchy }),
    ).toBe('hierarchy');
    expect(moderationErrorOf({ code: ErrorCode.NotFound })).toBe('gone');
    expect(moderationErrorOf(new TypeError('Network request failed'))).toBe(
      'failed',
    );
    expect(moderationErrorOf({ code: ErrorCode.Forbidden })).toBe('failed');
  });
});
