import {
  Permission as P,
  toPermissionBitmap,
  type RoleResponse,
  type ServerMember,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  applyMemberEvent,
  drawerGroups,
  memberBlock,
  memberRightLabel,
  memberRoleRows,
  sinceText,
  untilText,
} from './members';
import { roleActor } from './roles';

// Spec 08 › Quy ước chung: Ôn thi Giải tích 2 (id S), Owner An.
const S = '1000';
const server = { id: S, owner_id: 'an' };
const role = (id: string, name: string, position: number, bits = 0n) =>
  ({
    id,
    name,
    position,
    permissions: toPermissionBitmap(bits),
    is_mentionable: false,
  }) as RoleResponse;
const roles = [
  role(S, '@everyone', 0),
  role('dp', 'Điều phối phòng học', 1),
  role('tn', 'Trưởng nhóm', 2),
  role('qt', 'Quản trị', 3, P.MANAGE_ROLES),
];
const member = (
  id: string,
  name: string,
  roleIds: string[] = [],
  timeout: string | null = null,
): ServerMember => ({
  user: { id, username: `${id}.x`, display_name: name, avatar: null },
  role_ids: roleIds,
  joined_at: '2026-10-05T03:00:00Z',
  timeout_until: timeout,
});
const an = member('an', 'An', ['tn']);
const tuan = member('tuan', 'Tuấn', ['qt']);
const binh = member('binh', 'Bình', ['tn']);
const khanh = member('khanh', 'Khánh');
const actorOf = (m: ServerMember) =>
  roleActor(server, roles, m.user.id, m.role_ids);
const NOW = Date.parse('2026-10-18T13:12:00Z');

describe('memberRightLabel (C-28: "Owner" or the highest role)', () => {
  it('Owner, highest role, nothing for @everyone only', () => {
    expect(memberRightLabel(server, roles, an, NOW)).toEqual({
      kind: 'owner',
    });
    expect(
      memberRightLabel(server, roles, member('x', 'X', ['dp', 'tn']), NOW),
    ).toEqual({ kind: 'role', name: 'Trưởng nhóm' });
    expect(memberRightLabel(server, roles, khanh, NOW)).toBeNull();
  });

  it('S-SET-03: a running timeout takes the place of the role', () => {
    const quan = member('quan', 'Quân', ['dp'], '2026-10-18T14:12:00Z');
    expect(memberRightLabel(server, roles, quan, NOW)).toEqual({
      kind: 'timeout',
      until: '2026-10-18T14:12:00Z',
    });
    expect(
      memberRightLabel(server, roles, quan, Date.parse('2026-10-18T15:00:00Z')),
    ).toEqual({ kind: 'role', name: 'Điều phối phòng học' });
  });
});

describe('memberBlock (ROLE-04 AC1, `member-blocked`)', () => {
  it('Tuấn opens An → owner; Bình opens Tuấn → outranked; Tuấn opens Khánh → none', () => {
    expect(memberBlock(server, actorOf(tuan), an)).toBe('owner');
    expect(memberBlock(server, actorOf(binh), tuan)).toBe('outranked');
    expect(memberBlock(server, actorOf(tuan), khanh)).toBeNull();
  });

  it('level with oneself is blocked, oneself is not (CR-28 #24)', () => {
    expect(memberBlock(server, actorOf(tuan), member('x', 'X', ['qt']))).toBe(
      'outranked',
    );
    expect(memberBlock(server, actorOf(tuan), tuan)).toBeNull();
    expect(memberBlock(server, actorOf(an), an)).toBeNull();
  });
});

describe('memberRoleRows (`member-detail`: by position, locked above the viewer)', () => {
  it('Tuấn on Khánh: highest first, Quản trị locked, others free', () => {
    expect(
      memberRoleRows(server, roles, actorOf(tuan), khanh).map((r) => [
        r.role.name,
        r.checked,
        r.locked,
      ]),
    ).toEqual([
      ['Quản trị', false, true],
      ['Trưởng nhóm', false, false],
      ['Điều phối phòng học', false, false],
    ]);
  });

  it('Tuấn on An (Owner): every row locked, values kept', () => {
    expect(
      memberRoleRows(server, roles, actorOf(tuan), an).map((r) => [
        r.checked,
        r.locked,
      ]),
    ).toEqual([
      [false, true],
      [true, true],
      [false, true],
    ]);
  });
});

describe('drawerGroups (S-HOME-03: online incl. idle / DND, each by name)', () => {
  it('splits by presence and sorts each group', () => {
    const presence: Record<string, string> = { tuan: 'dnd', binh: 'idle' };
    const groups = drawerGroups(
      [tuan, khanh, an, binh],
      (id) => (presence[id] ?? 'offline') as 'offline',
    );
    expect(groups.online.map((m) => m.user.display_name)).toEqual([
      'Bình',
      'Tuấn',
    ]);
    expect(groups.offline.map((m) => m.user.display_name)).toEqual([
      'An',
      'Khánh',
    ]);
  });
});

describe('applyMemberEvent (no re-sort while the list is shown)', () => {
  const list = [an, binh, khanh];
  it('UPDATE replaces in place; another server is ignored', () => {
    const next = applyMemberEvent(list, S, {
      t: 'SERVER_MEMBER_UPDATE',
      s: 1,
      d: { ...khanh, server_id: S, role_ids: ['tn'] },
    });
    expect(next.map((m) => m.role_ids)).toEqual([['tn'], ['tn'], ['tn']]);
    expect(
      applyMemberEvent(list, S, {
        t: 'SERVER_MEMBER_UPDATE',
        s: 1,
        d: { ...khanh, server_id: '9', role_ids: ['tn'] },
      }),
    ).toBe(list);
  });

  it('ADD appends, REMOVE drops', () => {
    const chi = member('chi', 'Chi');
    const added = applyMemberEvent(list, S, {
      t: 'SERVER_MEMBER_ADD',
      s: 1,
      d: { ...chi, server_id: S },
    });
    expect(added.map((m) => m.user.id)).toEqual(['an', 'binh', 'khanh', 'chi']);
    expect(
      applyMemberEvent(added, S, {
        t: 'SERVER_MEMBER_REMOVE',
        s: 1,
        d: { server_id: S, user_id: 'binh' },
      }).map((m) => m.user.id),
    ).toEqual(['an', 'khanh', 'chi']);
  });
});

describe('untilText / sinceText (Asia/Ho_Chi_Minh)', () => {
  const TZ = 'Asia/Ho_Chi_Minh';
  it('today: the time; another day: time, dd/MM', () => {
    expect(untilText('2026-10-18T14:12:00Z', NOW, TZ)).toBe('21:12');
    expect(untilText('2026-10-19T13:12:00Z', NOW, TZ)).toBe('20:12, 19/10');
  });
  it('joined: dd/MM/yyyy in the user’s zone', () => {
    expect(sinceText('2026-10-04T18:00:00Z', TZ)).toBe('05/10/2026');
  });
});
