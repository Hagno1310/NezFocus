import {
  canActOnMember,
  canTimeOutMember,
  canGrantPermissions,
  canManageRole,
  computeBasePermissions,
  computeChannelPermissions,
  highestRole,
} from './compute-permissions.js';
import {
  HIERARCHY_MATRIX,
  PERMISSION_MATRIX,
  type HierarchyCase,
  type PermissionCase,
} from './permission-matrix.js';
import { permissionNames } from './permissions.js';

const compute = (c: PermissionCase) =>
  c.channel
    ? computeChannelPermissions(c.server, c.member, c.channel, c.now)
    : computeBasePermissions(c.server, c.member, c.now);

const decide = (c: HierarchyCase) => {
  switch (c.check) {
    case 'role':
      return canManageRole(c.server, c.actor, c.role);
    case 'member':
      return canActOnMember(c.server, c.actor, c.target);
    case 'grant':
      return canGrantPermissions(c.server, c.actor, c.permissions);
    case 'timeout':
      return canTimeOutMember(c.server, c.actor, c.target);
  }
};

describe('TS-PERM matrix (SRS 9.2, REQ-ROLE-08 AC1)', () => {
  it('has at least 50 cases, each named once', () => {
    const names = [...PERMISSION_MATRIX, ...HIERARCHY_MATRIX].map(
      (c) => c.name,
    );
    expect(names.length).toBeGreaterThanOrEqual(50);
    expect(new Set(names).size).toBe(names.length);
  });

  // Compare names so a failure reads as "missing SEND_MESSAGES", not two big numbers.
  it.each(PERMISSION_MATRIX.map((c) => [c.name, c] as const))('%s', (_, c) => {
    const actual = compute(c);
    expect(permissionNames(actual)).toEqual(permissionNames(c.expected));
    expect(actual).toBe(c.expected);
  });

  it.each(HIERARCHY_MATRIX.map((c) => [c.name, c] as const))('%s', (_, c) => {
    expect(decide(c)).toBe(c.expected);
  });
});

describe('computeChannelPermissions', () => {
  it('reads the clock when no time is given', () => {
    const c = PERMISSION_MATRIX.find((c) =>
      c.name.startsWith('Timeout: Dũng'),
    )!;
    // The sample timeout ended long before today.
    expect(computeChannelPermissions(c.server, c.member, c.channel!)).not.toBe(
      c.expected,
    );
  });
});

describe('@everyone in roleIds', () => {
  it('does not apply the @everyone overwrite a second time with the roles', () => {
    const c = PERMISSION_MATRIX.find((c) =>
      c.name.startsWith('Role deny thắng @everyone allow'),
    )!;
    const member = {
      ...c.member,
      roleIds: [c.server.id, ...c.member.roleIds],
    };
    expect(computeChannelPermissions(c.server, member, c.channel!, c.now)).toBe(
      c.expected,
    );
  });
});

describe('highestRole (REQ-ROLE-01 hierarchy)', () => {
  const server = {
    id: '1000',
    ownerId: '1',
    roles: [
      { id: '1000', permissions: 0n, position: 0 },
      { id: 'dieu-phoi', permissions: 0n, position: 1 },
      { id: 'quan-tri', permissions: 0n, position: 3 },
    ],
  };

  it('the position of the member’s highest role; 0 with none; null for the Owner', () => {
    expect(
      highestRole(server, { userId: '5', roleIds: ['dieu-phoi', 'quan-tri'] }),
    ).toBe(3);
    expect(highestRole(server, { userId: '4', roleIds: [] })).toBe(0);
    expect(highestRole(server, { userId: '1', roleIds: ['dieu-phoi'] })).toBe(
      null,
    );
  });
});
