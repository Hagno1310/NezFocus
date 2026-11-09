import {
  DEFAULT_EVERYONE_PERMISSIONS,
  Permission as P,
  permissionBits,
  toPermissionBitmap,
  type ChannelResponse,
  type PermissionOverwrite,
  type RoleResponse,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  addTargets,
  myChannelPermissions,
  overwritePermissions,
  overwriteSummary,
  privateViewers,
  shownOverwrites,
  triOf,
  withTri,
} from './channelPermissions';

const role = (
  id: string,
  name: string,
  position: number,
  perms: bigint,
): RoleResponse => ({
  id,
  name,
  position,
  permissions: toPermissionBitmap(perms),
  is_mentionable: false,
});
const EVERYONE = role('100', '@everyone', 0, DEFAULT_EVERYONE_PERMISSIONS);
const COORD = role('101', 'Điều phối phòng học', 1, P.MANAGE_STUDY_ROOMS);
const LEAD = role('102', 'Trưởng nhóm', 2, P.MANAGE_MESSAGES);
const ADMIN = role(
  '103',
  'Quản trị',
  3,
  permissionBits('MANAGE_ROLES', 'MANAGE_CHANNELS'),
);
const ROLES = [EVERYONE, COORD, LEAD, ADMIN];
const server = { id: '100', owner_id: '1' };

const ow = (
  target_id: string,
  allow: bigint,
  deny: bigint,
  target_type: 'role' | 'member' = 'role',
): PermissionOverwrite => ({
  target_id,
  target_type,
  allow: toPermissionBitmap(allow),
  deny: toPermissionBitmap(deny),
});
const ch = (
  id: string,
  type: ChannelResponse['type'],
  parent_id: string | null,
  synced: boolean,
  overwrites: PermissionOverwrite[] = [],
): ChannelResponse => ({
  id,
  server_id: '100',
  type,
  name: id,
  parent_id,
  position: 0,
  focus_control: 'off',
  permissions_synced: synced,
  permission_overwrites: overwrites,
});

describe('overwritePermissions (S-SET-06 `overwrite-edit`, `overwrite-edit-voice`)', () => {
  it('text, voice and category rows, in the frames order; never READ_MESSAGE_HISTORY', () => {
    expect(overwritePermissions('text')).toEqual([
      'VIEW_CHANNEL',
      'SEND_MESSAGES',
      'ATTACH_FILES',
      'EMBED_LINKS',
      'ADD_REACTIONS',
      'MENTION_EVERYONE',
      'MANAGE_MESSAGES',
      'CREATE_TASKS',
      'MANAGE_TASKS',
    ]);
    expect(overwritePermissions('voice')).toEqual([
      'VIEW_CHANNEL',
      'CONNECT',
      'SPEAK',
      'VIDEO',
      'SEND_MESSAGES',
      'MANAGE_STUDY_ROOMS',
      'MUTE_MEMBERS',
      'MOVE_MEMBERS',
    ]);
    const category = overwritePermissions('category');
    expect(category.slice(0, 9)).toEqual(overwritePermissions('text'));
    expect(category).toContain('MOVE_MEMBERS');
    expect(new Set(category).size).toBe(category.length);
  });
});

describe('triOf / withTri / overwriteSummary', () => {
  const news = ow('100', 0n, P.SEND_MESSAGES);
  it('reads and writes one bit in three steps', () => {
    expect(triOf(news, 'SEND_MESSAGES')).toBe('deny');
    expect(triOf(news, 'VIEW_CHANNEL')).toBe('default');
    expect(triOf(undefined, 'VIEW_CHANNEL')).toBe('default');
    expect(withTri(news, 'SEND_MESSAGES', 'allow')).toEqual({
      allow: toPermissionBitmap(P.SEND_MESSAGES),
      deny: '0',
    });
    expect(withTri(news, 'SEND_MESSAGES', 'default')).toEqual({
      allow: '0',
      deny: '0',
    });
  });

  it('counts allows and denies ("2 cho phép · 1 từ chối")', () => {
    expect(
      overwriteSummary(
        ow('102', P.SEND_MESSAGES | P.ATTACH_FILES, P.EMBED_LINKS),
      ),
    ).toEqual({ allow: 2, deny: 1 });
  });
});

describe('shownOverwrites (`overwrites`, `overwrites-synced`, `category-overwrites`)', () => {
  const info = ch('10', 'category', null, true, [
    ow('100', 0n, P.SEND_MESSAGES),
  ]);
  it('a synced channel shows its category; @everyone, then roles by rank, then members', () => {
    const own = ch('12', 'text', '10', false, [
      ow('7', P.SEND_MESSAGES, 0n, 'member'),
      ow('101', P.SEND_MESSAGES, 0n),
      ow('103', 0n, P.VIEW_CHANNEL),
      ow('100', 0n, P.SEND_MESSAGES),
    ]);
    expect(
      shownOverwrites(own, [info, own], ROLES).map((o) => o.target_id),
    ).toEqual(['100', '103', '101', '7']);
    const synced = ch('11', 'text', '10', true);
    expect(shownOverwrites(synced, [info, synced], ROLES)).toEqual(
      info.permission_overwrites,
    );
  });
});

describe('myChannelPermissions (8.5.2 in the app: overwrites now count)', () => {
  it('@everyone deny VIEW_CHANNEL hides the channel from a plain member, not from the Owner', () => {
    const hidden = ch('12', 'text', null, false, [
      ow('100', 0n, P.VIEW_CHANNEL),
    ]);
    const all = [hidden];
    expect(myChannelPermissions(server, ROLES, '7', [], hidden, all)).toBe(0n);
    expect(
      myChannelPermissions(server, ROLES, '1', [], hidden, all) &
        P.VIEW_CHANNEL,
    ).toBe(P.VIEW_CHANNEL);
  });
});

describe('addTargets (`add-target`)', () => {
  it('roles without an overwrite yet, by rank, @everyone left out once it has one; level or above is locked', () => {
    const channel = ch('12', 'text', null, false, [
      ow('102', P.SEND_MESSAGES, 0n),
    ]);
    const tuan = { userId: '9', roleIds: ['103'] };
    expect(addTargets(server, ROLES, channel, tuan)).toEqual([
      { role: ADMIN, locked: true },
      { role: COORD, locked: false },
      { role: EVERYONE, locked: false },
    ]);
  });
});

describe('privateViewers (S-SET-09 `private-roles`, `private-self-warning`)', () => {
  it("roles by rank without @everyone; ADMINISTRATOR ticked and locked; the creator's highest ticked first", () => {
    const boss = role('104', 'Ban cán sự', 4, P.ADMINISTRATOR);
    const roles = [...ROLES, boss];
    const tuan = { userId: '9', roleIds: ['103'] };
    const v = privateViewers(server, roles, tuan);
    expect(v.rows.map((r) => [r.role.name, r.locked, r.mine])).toEqual([
      ['Ban cán sự', true, false],
      ['Quản trị', false, true],
      ['Trưởng nhóm', false, false],
      ['Điều phối phòng học', false, false],
    ]);
    expect(v.initial).toEqual(['103']);
    expect(v.wouldHide(['102'])).toBe(true);
    expect(v.wouldHide(['103'])).toBe(false);
    const an = privateViewers(server, roles, { userId: '1', roleIds: [] });
    expect(an.initial).toEqual([]);
    expect(an.wouldHide([])).toBe(false);
  });
});
