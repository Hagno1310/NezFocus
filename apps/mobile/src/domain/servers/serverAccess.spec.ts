import {
  DEFAULT_EVERYONE_PERMISSIONS,
  permissionBits,
  toPermissionBitmap,
  type RoleResponse,
  type ServerSummary,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  channelMenuRows,
  channelSettingsRows,
  managementLost,
  myServerPermissions,
  serverMenuRows,
  serverSettingsRows,
} from './serverAccess';

const server: ServerSummary = {
  id: '100',
  name: 'Ôn thi Giải tích 2',
  icon_url: null,
  owner_id: '1', // An
  template: 'study_server',
  system_channel_id: '11',
  member_count: 24,
  created_at: '2026-10-01T01:00:00.000Z',
};
const everyone = (perms: bigint): RoleResponse => ({
  id: '100',
  name: '@everyone',
  permissions: toPermissionBitmap(perms),
  position: 0,
  is_mentionable: false,
});

describe('S-HOME-09 / S-SET-01: rows shown by permission (Q17: no disabled rows)', () => {
  const an = myServerPermissions(
    server,
    [everyone(DEFAULT_EVERYONE_PERMISSIONS)],
    '1',
  );
  const member = myServerPermissions(
    server,
    [everyone(DEFAULT_EVERYONE_PERMISSIONS)],
    '7',
  );

  it('owner: Mời bạn · Tạo kênh · Cài đặt server · Rời server', () => {
    expect(serverMenuRows(an, true)).toEqual([
      'invite',
      'createChannel',
      'settings',
      'leave',
    ]);
    expect(serverSettingsRows(an, true)).toEqual([
      'overview',
      'roles',
      'members',
      'invites',
      'bans',
      'reports',
      'transfer',
      'delete',
    ]);
  });

  it('member: Mời bạn · Báo cáo server · Rời server; no settings', () => {
    expect(serverMenuRows(member, false)).toEqual([
      'invite',
      'report',
      'leave',
    ]);
    expect(serverSettingsRows(member, false)).toEqual([]);
  });

  it('roles not loaded yet: only @everyone counts, and nothing for an unknown user', () => {
    expect(myServerPermissions(server, undefined, '7')).toBe(0n);
    expect(serverMenuRows(0n, false)).toEqual(['report', 'leave']);
  });

  it("a member's own roles count (me.role_ids): Quản trị with MANAGE_ROLES sees Vai trò", () => {
    const admin: RoleResponse = {
      id: '103',
      name: 'Quản trị',
      permissions: toPermissionBitmap(permissionBits('MANAGE_ROLES')),
      position: 3,
      is_mentionable: false,
    };
    const roles = [everyone(DEFAULT_EVERYONE_PERMISSIONS), admin];
    const tuan = myServerPermissions(server, roles, '9', ['103']);
    expect(serverSettingsRows(tuan, false)).toEqual(['roles', 'members']);
    expect(myServerPermissions(server, roles, '9')).toBe(
      DEFAULT_EVERYONE_PERMISSIONS,
    );
  });

  it('a manager without MANAGE_CHANNELS sees settings, not Tạo kênh', () => {
    const mod = permissionBits(
      'CREATE_INVITE',
      'KICK_MEMBERS',
      'MANAGE_MESSAGES',
    );
    expect(serverMenuRows(mod, false)).toEqual([
      'invite',
      'settings',
      'report',
      'leave',
    ]);
    expect(serverSettingsRows(mod, false)).toEqual(['members', 'reports']);
  });
});

describe('S-HOME-02 `channel-menu` / S-SET-06: rows by permission', () => {
  const all = permissionBits(
    'MANAGE_CHANNELS',
    'MANAGE_ROLES',
    'MANAGE_STUDY_ROOMS',
  );
  const chi = permissionBits('MANAGE_STUDY_ROOMS'); // Điều phối phòng học

  it('MANAGE_CHANNELS: Cài đặt kênh · Sắp xếp kênh on any channel', () => {
    expect(channelMenuRows(all, 'text')).toEqual(['settings', 'reorder']);
    expect(channelMenuRows(all, 'voice')).toEqual(['settings', 'reorder']);
  });

  it('only MANAGE_STUDY_ROOMS: Cài đặt kênh on voice only; nothing on text', () => {
    expect(channelMenuRows(chi, 'voice')).toEqual(['settings']);
    expect(channelMenuRows(chi, 'text')).toEqual([]);
    expect(channelMenuRows(0n, 'voice')).toEqual([]);
  });

  it('S-SET-06 `text` / `voice`; `voice · study-rooms-only` keeps Phòng học', () => {
    expect(channelSettingsRows(all, 'text')).toEqual([
      'overview',
      'permissions',
      'taskBoard',
    ]);
    expect(channelSettingsRows(all, 'voice')).toEqual([
      'overview',
      'permissions',
      'studyRoom',
    ]);
    expect(channelSettingsRows(chi, 'voice')).toEqual(['studyRoom']);
    expect(channelSettingsRows(chi, 'text')).toEqual([]);
  });

  it('Quyền needs MANAGE_CHANNELS only (SRS 8.5.1: overwrites belong to it)', () => {
    expect(
      channelSettingsRows(permissionBits('MANAGE_CHANNELS'), 'text'),
    ).toContain('permissions');
  });
});

describe('managementLost', () => {
  it('waits while the server list is not loaded (signed out, before READY)', () => {
    expect(
      managementLost({
        listLoaded: false,
        found: false,
        rolesLoaded: false,
        allowed: false,
      }),
    ).toBe(false);
  });

  it('closes when the loaded list no longer has the server (kicked, deleted)', () => {
    expect(
      managementLost({
        listLoaded: true,
        found: false,
        rolesLoaded: false,
        allowed: false,
      }),
    ).toBe(true);
  });

  it('waits for the roles before judging permission (refetched after a reconnect)', () => {
    expect(
      managementLost({
        listLoaded: true,
        found: true,
        rolesLoaded: false,
        allowed: false,
      }),
    ).toBe(false);
  });

  it('closes when the roles are in and the permission is gone', () => {
    expect(
      managementLost({
        listLoaded: true,
        found: true,
        rolesLoaded: true,
        allowed: false,
      }),
    ).toBe(true);
    expect(
      managementLost({
        listLoaded: true,
        found: true,
        rolesLoaded: true,
        allowed: true,
      }),
    ).toBe(false);
  });
});
