import {
  DEFAULT_EVERYONE_PERMISSIONS,
  ErrorCode,
  MAX_ROLES_PER_SERVER,
  Permission as P,
  permissionBits,
  toPermissionBitmap,
  type RoleResponse,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../data/api/client';
import {
  checkRoleName,
  dropRole,
  roleActor,
  roleEditor,
  roleErrorOf,
  roleList,
  withPermission,
} from './roles';

// Spec 08 › Quy ước chung: Quản trị (3, Tuấn) > Trưởng nhóm (2, An, Bình) > Điều phối
// phòng học (1, Chi) > @everyone. An (1) is the Owner.
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
const LEAD = role(
  '102',
  'Trưởng nhóm',
  2,
  permissionBits(
    'MANAGE_STUDY_ROOMS',
    'MANAGE_TASKS',
    'MANAGE_MESSAGES',
    'MODERATE_MEMBERS',
    'KICK_MEMBERS',
  ),
);
const ADMIN = role(
  '103',
  'Quản trị',
  3,
  permissionBits(
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'MODERATE_MEMBERS',
    'MANAGE_MESSAGES',
  ),
);
const ROLES = [EVERYONE, LEAD, COORD, ADMIN]; // any order, as the store keeps them
const server = { id: '100', owner_id: '1' };
const an = roleActor(server, ROLES, '1', ['102']);
const tuan = roleActor(server, ROLES, '9', ['103']);

describe('roleList (S-SET-02 `list`, `hierarchy-blocked`, `limit`, `roles-empty`)', () => {
  it('An: highest first, @everyone last, nothing locked', () => {
    const list = roleList(server.id, ROLES, an);
    expect(list.rows.map((r) => [r.role.name, r.locked])).toEqual([
      ['Quản trị', false],
      ['Trưởng nhóm', false],
      ['Điều phối phòng học', false],
      ['@everyone', false],
    ]);
    expect(list.rows.at(-1)!.everyone).toBe(true);
    expect(list).toMatchObject({
      blockedBy: null,
      atLimit: false,
      empty: false,
    });
  });

  it('Tuấn: only Quản trị is locked ("Ngang bạn"), and the line names it', () => {
    const list = roleList(server.id, ROLES, tuan);
    expect(list.rows.filter((r) => r.locked).map((r) => r.role.name)).toEqual([
      'Quản trị',
    ]);
    expect(list.blockedBy?.name).toBe('Quản trị');
  });

  it('250 roles is the limit; only @everyone is roles-empty', () => {
    const many = Array.from({ length: MAX_ROLES_PER_SERVER - 1 }, (_, i) =>
      role(String(1000 + i), `Nhóm ôn đề ${i + 1}`, i + 1, 0n),
    );
    expect(roleList(server.id, [EVERYONE, ...many], an).atLimit).toBe(true);
    expect(roleList(server.id, [EVERYONE], an).empty).toBe(true);
  });
});

describe('dropRole (S-SET-02 `reorder`: saved on drop, never to or above your highest)', () => {
  it('An drops Điều phối phòng học on top: the whole list numbered from the top down', () => {
    expect(dropRole(server.id, ROLES, '101', 0, an)).toEqual({
      ok: true,
      body: [
        { id: '101', position: 3 },
        { id: '103', position: 2 },
        { id: '102', position: 1 },
      ],
    });
  });

  it('a drop back in place calls nothing', () => {
    expect(dropRole(server.id, ROLES, '102', 1, an)).toEqual({
      ok: true,
      body: null,
    });
  });

  it('Tuấn lifting Trưởng nhóm above Quản trị goes back (no API); below is fine', () => {
    expect(dropRole(server.id, ROLES, '102', 0, tuan)).toEqual({ ok: false });
    expect(dropRole(server.id, ROLES, '102', 2, tuan)).toMatchObject({
      ok: true,
    });
    expect(dropRole(server.id, ROLES, '103', 2, tuan)).toEqual({ ok: false });
  });
});

describe('roleEditor (S-SET-02 `edit-role`, `role-readonly`, `permission-locked`, `admin-on`, `everyone`)', () => {
  const row = (editor: ReturnType<typeof roleEditor>, name: string) =>
    editor.groups.flatMap((g) => g.rows).find((r) => r.name === name)!;

  it('An edits Quản trị: groups in spec order, values from the bitmap, nothing locked', () => {
    const editor = roleEditor(server.id, ADMIN, ROLES, an);
    expect(editor.groups.map((g) => g.id)).toEqual([
      'general',
      'members',
      'messages',
      'voice',
      'study',
    ]);
    expect(editor).toMatchObject({
      readonly: false,
      everyone: false,
      adminOn: false,
    });
    expect(row(editor, 'MANAGE_CHANNELS')).toEqual({
      name: 'MANAGE_CHANNELS',
      on: true,
      locked: false,
    });
    expect(row(editor, 'CREATE_INVITE').on).toBe(false);
  });

  it('Tuấn opens Quản trị: read only, real values', () => {
    const editor = roleEditor(server.id, ADMIN, ROLES, tuan);
    expect(editor.readonly).toBe(true);
    expect(row(editor, 'BAN_MEMBERS').on).toBe(true);
  });

  it('Tuấn edits Điều phối phòng học: bits he lacks are locked, even one already on', () => {
    const editor = roleEditor(server.id, COORD, ROLES, tuan);
    expect(editor.readonly).toBe(false);
    const locked = editor.groups
      .flatMap((g) => g.rows)
      .filter((r) => r.locked)
      .map((r) => r.name);
    expect(locked).toEqual([
      'ADMINISTRATOR',
      'MANAGE_SERVER',
      'MENTION_EVERYONE',
      'MUTE_MEMBERS',
      'MOVE_MEMBERS',
      'MANAGE_STUDY_ROOMS',
      'MANAGE_TASKS',
    ]);
    expect(row(editor, 'MANAGE_STUDY_ROOMS')).toMatchObject({
      on: true,
      locked: true,
    });
    expect(row(editor, 'CREATE_TASKS').locked).toBe(false); // via @everyone
  });

  it('ADMINISTRATOR on: admin-on; @everyone is its own editor', () => {
    const boss = { ...LEAD, permissions: toPermissionBitmap(P.ADMINISTRATOR) };
    expect(roleEditor(server.id, boss, ROLES, an).adminOn).toBe(true);
    expect(roleEditor(server.id, EVERYONE, ROLES, an).everyone).toBe(true);
  });

  it('withPermission flips one bit of the bitmap', () => {
    expect(withPermission(COORD, 'KICK_MEMBERS', true)).toBe(
      toPermissionBitmap(P.MANAGE_STUDY_ROOMS | P.KICK_MEMBERS),
    );
    expect(withPermission(COORD, 'MANAGE_STUDY_ROOMS', false)).toBe('0');
  });
});

describe('checkRoleName (REQ-ROLE-01 AC4, AC5: before the API)', () => {
  it('trims; refuses empty, everyone / @here, and a name taken in any case', () => {
    expect(checkRoleName(ROLES, ' Thư ký ')).toEqual({
      ok: true,
      name: 'Thư ký',
    });
    expect(checkRoleName(ROLES, '  ')).toEqual({ ok: false, error: 'empty' });
    expect(checkRoleName(ROLES, '@Here')).toEqual({
      ok: false,
      error: 'reserved',
    });
    expect(checkRoleName(ROLES, 'trưởng nhóm')).toEqual({
      ok: false,
      error: 'taken',
      taken: 'Trưởng nhóm',
    });
    expect(checkRoleName(ROLES, 'Trưởng nhóm', '102')).toEqual({
      ok: true,
      name: 'Trưởng nhóm',
    });
  });
});

describe('roleErrorOf (what a refused role write means for the screen)', () => {
  const api = (
    status: number,
    code: number,
    field?: string,
    fieldCode?: string,
  ) =>
    new ApiError(status, {
      code,
      message: 'x',
      ...(field && {
        errors: { [field]: [{ code: fieldCode!, message: 'x' }] },
      }),
    });

  it('maps the codes of RoleRoutes', () => {
    expect(roleErrorOf(api(403, ErrorCode.InsufficientRoleHierarchy))).toBe(
      'hierarchy',
    );
    expect(roleErrorOf(api(403, ErrorCode.Forbidden))).toBe('forbidden');
    expect(roleErrorOf(api(404, ErrorCode.NotFound))).toBe('gone');
    expect(
      roleErrorOf(
        api(400, ErrorCode.ValidationError, 'name', 'DUPLICATE_NAME'),
      ),
    ).toBe('taken');
    expect(
      roleErrorOf(api(400, ErrorCode.ValidationError, 'name', 'RESERVED_NAME')),
    ).toBe('reserved');
    expect(
      roleErrorOf(api(400, ErrorCode.ValidationError, '_', 'MAX_ROLES')),
    ).toBe('limit');
    expect(roleErrorOf(new TypeError('Network request failed'))).toBe('failed');
  });
});
