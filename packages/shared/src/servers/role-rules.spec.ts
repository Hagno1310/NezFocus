import { describe, expect, it } from 'vitest';
import { newRolePlace, planRoleReorder } from './role-rules.js';

// Spec 08 › Quy ước chung: "Ôn thi Giải tích 2" (id 1000).
const SERVER = '1000';
const roles = [
  { id: SERVER, position: 0 }, // @everyone
  { id: 'dieu-phoi', position: 1 },
  { id: 'truong-nhom', position: 2 },
  { id: 'quan-tri', position: 3 },
];
const OWNER = null; // the Owner is above every role
const TUAN = 3; // highest role: Quản trị

describe('newRolePlace (REQ-ROLE-01: right below the creator’s highest role)', () => {
  it('Tuấn: the new role takes 3, Quản trị moves up to 4', () => {
    expect(newRolePlace(SERVER, roles, TUAN)).toEqual({
      position: 3,
      shifted: [{ id: 'quan-tri', position: 4 }],
    });
  });

  it('the Owner, or someone with no role, creates at the top', () => {
    expect(newRolePlace(SERVER, roles, OWNER)).toEqual({
      position: 4,
      shifted: [],
    });
    expect(newRolePlace(SERVER, roles, 0)).toEqual({
      position: 4,
      shifted: [],
    });
    expect(newRolePlace(SERVER, [roles[0]!], OWNER)).toEqual({
      position: 1,
      shifted: [],
    });
  });
});

describe('planRoleReorder', () => {
  it('moves a role and renumbers 1..n (the app sends the whole list)', () => {
    expect(
      planRoleReorder(
        SERVER,
        roles,
        [
          { id: 'dieu-phoi', position: 2 },
          { id: 'truong-nhom', position: 1 },
        ],
        OWNER,
      ),
    ).toEqual({
      ok: true,
      changed: [
        { id: 'truong-nhom', position: 1 },
        { id: 'dieu-phoi', position: 2 },
      ],
    });
  });

  it('a lone move takes the slot it asks for', () => {
    expect(
      planRoleReorder(SERVER, roles, [{ id: 'dieu-phoi', position: 2 }], OWNER),
    ).toEqual({
      ok: true,
      changed: [
        { id: 'truong-nhom', position: 1 },
        { id: 'dieu-phoi', position: 2 },
      ],
    });
  });

  it('closes gaps left by deleted roles', () => {
    const gappy = [
      roles[0]!,
      { id: 'a', position: 2 },
      { id: 'b', position: 7 },
    ];
    expect(
      planRoleReorder(SERVER, gappy, [{ id: 'a', position: 2 }], OWNER),
    ).toEqual({
      ok: true,
      changed: [
        { id: 'a', position: 1 },
        { id: 'b', position: 2 },
      ],
    });
  });

  it('Tuấn reorders below Quản trị', () => {
    expect(
      planRoleReorder(
        SERVER,
        roles,
        [
          { id: 'dieu-phoi', position: 2 },
          { id: 'truong-nhom', position: 1 },
        ],
        TUAN,
      ).ok,
    ).toBe(true);
  });

  it('nobody lifts a role level with or above their own highest (40301)', () => {
    expect(
      planRoleReorder(
        SERVER,
        roles,
        [{ id: 'truong-nhom', position: 3 }],
        TUAN,
      ),
    ).toEqual({ ok: false, error: 'hierarchy' });
    expect(
      planRoleReorder(
        SERVER,
        roles,
        [{ id: 'truong-nhom', position: 9 }],
        TUAN,
      ),
    ).toEqual({ ok: false, error: 'hierarchy' });
  });

  it('nobody moves a role level with or above their own (40301)', () => {
    expect(
      planRoleReorder(SERVER, roles, [{ id: 'quan-tri', position: 1 }], TUAN),
    ).toEqual({ ok: false, error: 'hierarchy' });
  });

  it('@everyone never moves; an unknown role is refused (40001)', () => {
    expect(
      planRoleReorder(SERVER, roles, [{ id: SERVER, position: 2 }], OWNER),
    ).toEqual({ ok: false, error: 'everyone' });
    expect(
      planRoleReorder(SERVER, roles, [{ id: 'khac', position: 1 }], OWNER),
    ).toEqual({ ok: false, error: 'unknown_role' });
  });
});
