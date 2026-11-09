import { Permission as P } from '../permissions/permissions.js';
import type { PermissionOverwrite } from './channel.contract.js';
import {
  addedAllows,
  canEditOverwrite,
  privateChannelOverwrites,
} from './overwrite-rules.js';

// "Ôn thi Giải tích 2" (spec 08 › Quy ước chung): Quản trị (Tuấn) > Trưởng nhóm (Bình) >
// Điều phối phòng học > @everyone; An is the Owner.
const server = {
  id: '1',
  ownerId: 'an',
  roles: [
    { id: '1', permissions: 0n, position: 0 },
    { id: '11', permissions: P.MANAGE_STUDY_ROOMS, position: 1 },
    { id: '12', permissions: 0n, position: 2 },
    { id: '13', permissions: P.MANAGE_CHANNELS, position: 3 },
  ],
};
const role = (id: string) => ({
  type: 'role' as const,
  role: server.roles.find((r) => r.id === id)!,
});
const member = (userId: string, roleIds: string[]) => ({
  type: 'member' as const,
  member: { userId, roleIds },
});
const an = { userId: 'an', roleIds: ['12'] };
const tuan = { userId: 'tuan', roleIds: ['13'] };

const ow = (
  target_id: string,
  allow: bigint,
  deny: bigint,
  target_type: 'role' | 'member' = 'role',
): PermissionOverwrite => ({
  target_id,
  target_type,
  allow: allow.toString(),
  deny: deny.toString(),
});

describe('privateChannelOverwrites (REQ-ROLE-03 v1.9, CR-17)', () => {
  it('keeps the category overwrites, denies @everyone VIEW_CHANNEL, allows it to every chosen role', () => {
    const inherited = [
      ow('1', 0n, P.SEND_MESSAGES),
      ow('12', 0n, P.VIEW_CHANNEL | P.CONNECT),
    ];
    expect(privateChannelOverwrites('1', inherited, ['12', '13'])).toEqual([
      ow('1', 0n, P.SEND_MESSAGES | P.VIEW_CHANNEL),
      ow('12', P.VIEW_CHANNEL, P.CONNECT), // a chosen role's deny gives way
      ow('13', P.VIEW_CHANNEL, 0n),
    ]);
  });

  it('no role chosen: only the Owner and ADMINISTRATOR see it', () => {
    expect(privateChannelOverwrites('1', [], [])).toEqual([
      ow('1', 0n, P.VIEW_CHANNEL),
    ]);
  });

  it('an inherited @everyone allow of VIEW_CHANNEL turns into the deny', () => {
    expect(
      privateChannelOverwrites('1', [ow('1', P.VIEW_CHANNEL, 0n)], []),
    ).toEqual([ow('1', 0n, P.VIEW_CHANNEL)]);
  });
});

describe('canEditOverwrite (SRS 8.5.2 hierarchy)', () => {
  it('Tuấn edits what sits below Quản trị, not Quản trị itself, not the Owner, not himself', () => {
    const can = (target: Parameters<typeof canEditOverwrite>[2]) =>
      canEditOverwrite(server, tuan, target);
    expect(can(role('1'))).toBe(true); // @everyone
    expect(can(role('12'))).toBe(true);
    expect(can(role('13'))).toBe(false);
    expect(can(member('binh', ['12']))).toBe(true);
    expect(can(member('an', ['12']))).toBe(false);
    expect(can(member('tuan', ['13']))).toBe(false);
  });

  it('the Owner edits every role; someone with no role edits nothing, @everyone included', () => {
    expect(canEditOverwrite(server, an, role('13'))).toBe(true);
    const plain = { userId: 'lan', roleIds: [] };
    expect(canEditOverwrite(server, plain, role('1'))).toBe(false);
    expect(canEditOverwrite(server, plain, member('khanh', []))).toBe(false);
  });
});

describe('addedAllows (only "Cho phép" one holds, 8.5.2)', () => {
  it('counts the allows the write adds, not the ones already there or the denies', () => {
    const before = ow('1', P.SEND_MESSAGES, P.CONNECT);
    expect(
      addedAllows(before, {
        allow: (P.SEND_MESSAGES | P.ATTACH_FILES).toString(),
      }),
    ).toBe(P.ATTACH_FILES);
    expect(addedAllows(undefined, { allow: P.SPEAK.toString() })).toBe(P.SPEAK);
    expect(addedAllows(before, { allow: '0' })).toBe(0n);
  });
});
