import { describe, expect, it } from 'vitest';
import {
  HIDDEN_ROLE_PERMISSIONS,
  ROLE_PERMISSION_GROUPS,
  keepHiddenPermissions,
} from './permission-groups.js';
import {
  ALL_PERMISSIONS,
  Permission,
  permissionBits,
  permissionNames,
} from './permissions.js';

const shown = ROLE_PERMISSION_GROUPS.flatMap((g) => g.permissions);

describe('ROLE_PERMISSION_GROUPS (S-SET-02 › Nhóm quyền)', () => {
  it('lists the groups in screen order', () => {
    expect(ROLE_PERMISSION_GROUPS.map((g) => g.id)).toEqual([
      'general',
      'members',
      'messages',
      'voice',
      'study',
    ]);
  });

  it('starts with the rows of QUYỀN CHUNG in spec order', () => {
    expect(ROLE_PERMISSION_GROUPS[0]!.permissions).toEqual([
      'ADMINISTRATOR',
      'MANAGE_SERVER',
      'MANAGE_CHANNELS',
      'MANAGE_ROLES',
      'CREATE_INVITE',
    ]);
  });

  it('hides exactly the bits without an MVP screen (8.5.1 v1.7)', () => {
    expect(permissionNames(HIDDEN_ROLE_PERMISSIONS)).toEqual([
      'VIEW_AUDIT_LOG',
      'DEAFEN_MEMBERS',
      'CHANGE_NICKNAME',
      'MANAGE_NICKNAMES',
      'MANAGE_EVENTS',
    ]);
  });

  it('shows every other defined bit exactly once', () => {
    expect(new Set(shown).size).toBe(shown.length);
    expect(permissionBits(...shown) | HIDDEN_ROLE_PERMISSIONS).toBe(
      ALL_PERMISSIONS,
    );
    expect(permissionBits(...shown) & HIDDEN_ROLE_PERMISSIONS).toBe(0n);
  });
});

describe('keepHiddenPermissions (REQ-ROLE-02 v1.7)', () => {
  it('takes the shown bits from the edit and the hidden ones from the saved role', () => {
    const saved = Permission.MANAGE_EVENTS | Permission.SEND_MESSAGES;
    const edited = Permission.CONNECT; // a client that dropped the hidden bit
    expect(keepHiddenPermissions(saved, edited)).toBe(
      Permission.MANAGE_EVENTS | Permission.CONNECT,
    );
  });

  it('never lets an edit turn a hidden bit on', () => {
    expect(keepHiddenPermissions(0n, Permission.VIEW_AUDIT_LOG)).toBe(0n);
  });
});
