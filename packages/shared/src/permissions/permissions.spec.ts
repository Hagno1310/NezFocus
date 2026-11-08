import {
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE_PERMISSIONS,
  hasPermission,
  parsePermissionBitmap,
  Permission,
  PermissionBitmap,
  permissionBits,
  permissionNames,
  toPermissionBitmap,
} from './permissions.js';

describe('Permission bits (SRS 8.5.1)', () => {
  it('keeps the bit numbers of 8.5.1', () => {
    expect(Permission.CREATE_INVITE).toBe(1n);
    expect(Permission.ADMINISTRATOR).toBe(1n << 3n);
    expect(Permission.VIEW_CHANNEL).toBe(1n << 8n);
    expect(Permission.MENTION_EVERYONE).toBe(1n << 14n);
    expect(Permission.MANAGE_EVENTS).toBe(1n << 28n);
  });

  it('has 28 bits; bit 13 (retired) and 29–63 are never part of ALL', () => {
    expect(permissionNames(ALL_PERMISSIONS)).toHaveLength(28);
    expect(ALL_PERMISSIONS & (1n << 13n)).toBe(0n);
    expect(ALL_PERMISSIONS >> 29n).toBe(0n);
  });

  it('gives @everyone the ✔ column of 8.5.1 (8.5.3)', () => {
    expect(permissionNames(DEFAULT_EVERYONE_PERMISSIONS)).toEqual([
      'CREATE_INVITE',
      'ADD_REACTIONS',
      'VIEW_CHANNEL',
      'SEND_MESSAGES',
      'EMBED_LINKS',
      'ATTACH_FILES',
      'CONNECT',
      'SPEAK',
      'VIDEO',
      'CHANGE_NICKNAME',
      'CREATE_TASKS',
    ]);
  });

  it('hasPermission needs every requested bit', () => {
    const perms = permissionBits('SEND_MESSAGES', 'CONNECT');
    expect(hasPermission(perms, Permission.SEND_MESSAGES)).toBe(true);
    expect(
      hasPermission(perms, Permission.SEND_MESSAGES | Permission.SPEAK),
    ).toBe(false);
  });
});

describe('PermissionBitmap (JSON form, AGENTS.md)', () => {
  it('round-trips through a decimal string', () => {
    expect(toPermissionBitmap(ALL_PERMISSIONS)).toBe('536862719');
    expect(parsePermissionBitmap('536862719')).toBe(ALL_PERMISSIONS);
    expect(parsePermissionBitmap('0')).toBe(0n);
  });

  it.each(['', '-1', '12a', '1.5', ' 1', String(2n ** 63n)])(
    'rejects %j',
    (value) => {
      expect(PermissionBitmap.safeParse(value).success).toBe(false);
      expect(() => parsePermissionBitmap(value)).toThrow();
    },
  );

  it('accepts the largest signed 64-bit value', () => {
    expect(PermissionBitmap.safeParse(String(2n ** 63n - 1n)).success).toBe(
      true,
    );
  });
});
