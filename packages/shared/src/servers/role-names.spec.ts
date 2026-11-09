import { describe, expect, it } from 'vitest';
import {
  RESERVED_ROLE_NAME_MESSAGE,
  ROLE_NAME_MAX,
  RoleName,
  duplicateRoleMessage,
  findDuplicateRole,
} from './role-names.js';

const issue = (r: ReturnType<typeof RoleName.safeParse>) => {
  const i = r.error?.issues[0] as
    { message: string; params?: { code?: string } } | undefined;
  return { message: i?.message, code: i?.params?.code };
};

// Spec 08 › Quy ước chung: the sample roles of Study Server "Ôn thi THPT 2026".
const roles = [
  { id: '1', name: '@everyone' },
  { id: '2', name: 'Quản trị' },
  { id: '3', name: 'Trưởng nhóm' },
  { id: '4', name: 'Điều phối phòng học' },
];

describe('RoleName (REQ-ROLE-01 v1.9)', () => {
  it('keeps 1–100 characters, trimmed', () => {
    expect(RoleName.parse('  Trưởng nhóm ')).toBe('Trưởng nhóm');
    expect(RoleName.safeParse('   ').success).toBe(false);
    expect(RoleName.safeParse('a'.repeat(ROLE_NAME_MAX)).success).toBe(true);
    expect(RoleName.safeParse('a'.repeat(ROLE_NAME_MAX + 1)).success).toBe(
      false,
    );
  });

  it('saves the NFC form', () => {
    expect(RoleName.parse('Tru\u031Bo\u031B\u0300ng nhóm')).toBe('Trường nhóm');
  });

  it.each(['@here', 'here', 'everyone', '@everyone', ' Everyone ', '@HERE'])(
    'refuses the system name %j (AC5)',
    (name) => {
      const r = RoleName.safeParse(name);
      expect(r.success).toBe(false);
      expect(issue(r)).toEqual({
        message: RESERVED_ROLE_NAME_MESSAGE,
        code: 'RESERVED_NAME',
      });
    },
  );

  it('allows names that only contain a system word', () => {
    expect(RoleName.safeParse('everyone học nhóm').success).toBe(true);
    expect(RoleName.safeParse('@@here').success).toBe(true);
  });
});

describe('findDuplicateRole', () => {
  it('matches case-insensitively (AC4: trưởng nhóm = Trưởng nhóm)', () => {
    expect(findDuplicateRole(roles, { name: 'trưởng nhóm' })?.id).toBe('3');
    expect(findDuplicateRole(roles, { name: 'QUẢN TRỊ' })?.id).toBe('2');
  });

  it('tells accents apart', () => {
    expect(findDuplicateRole(roles, { name: 'Truong nhom' })).toBeNull();
    expect(findDuplicateRole(roles, { name: 'Quản trí' })).toBeNull();
  });

  it('compares the NFC form', () => {
    expect(
      findDuplicateRole(roles, { name: 'Tru\u031Bo\u031B\u0309ng nhóm' })?.id,
    ).toBe('3');
  });

  it('never matches the role being renamed', () => {
    expect(
      findDuplicateRole(roles, { id: '3', name: 'trưởng nhóm' }),
    ).toBeNull();
  });
});

describe('duplicateRoleMessage', () => {
  it('names the role already holding the name', () => {
    expect(duplicateRoleMessage({ name: 'Trưởng nhóm' })).toBe(
      'Đã có vai trò Trưởng nhóm',
    );
  });
});
