import { describe, expect, it } from 'vitest';
import { parseDispatch } from '../gateway/events.contract.js';
import { computeChannelPermissions } from '../permissions/compute-permissions.js';
import {
  Permission as P,
  DEFAULT_EVERYONE_PERMISSIONS,
  hasPermission,
  toPermissionBitmap,
} from '../permissions/permissions.js';
import {
  ChannelResponse,
  PermissionOverwrite,
  PutChannelPermissionRequest,
  toPermissionOverwrite,
} from './channel.contract.js';
import {
  CreateRoleRequest,
  MAX_ROLES_PER_SERVER,
  RoleListResponse,
  RoleResponse,
  UpdateRolePositionsRequest,
  UpdateRoleRequest,
  toPermissionRole,
} from './role.contract.js';
import { ServerResponse } from './server.contract.js';

// Spec 08 › Quy ước chung: Study Server "Ôn thi THPT 2026" (id 100), Owner An.
const everyone = {
  id: '100',
  name: '@everyone',
  permissions: toPermissionBitmap(DEFAULT_EVERYONE_PERMISSIONS),
  position: 0,
  is_mentionable: false,
};
const quanTri = {
  id: '101',
  name: 'Quản trị',
  permissions: toPermissionBitmap(P.MANAGE_CHANNELS | P.MANAGE_ROLES),
  position: 3,
  is_mentionable: false,
};
// #thong-bao: only Quản trị posts (seed ponytail of server-templates.ts).
const thongBao = {
  id: '201',
  server_id: '100',
  type: 'text',
  name: 'thong-bao',
  parent_id: null,
  position: 0,
  focus_control: 'off',
  permissions_synced: false,
  permission_overwrites: [
    {
      target_id: '100',
      target_type: 'role',
      allow: '0',
      deny: toPermissionBitmap(P.SEND_MESSAGES),
    },
    {
      target_id: '101',
      target_type: 'role',
      allow: toPermissionBitmap(P.SEND_MESSAGES),
      deny: '0',
    },
  ],
};

describe('RoleResponse', () => {
  it('carries the bitmap as a string (AGENTS.md)', () => {
    expect(RoleResponse.parse(quanTri)).toEqual(quanTri);
    expect(
      RoleResponse.safeParse({ ...quanTri, permissions: 48 }).success,
    ).toBe(false);
  });

  it('has no color or hoist in the app (v1.7)', () => {
    expect(
      Object.keys(
        RoleResponse.parse({ ...quanTri, color: 1, is_hoisted: true }),
      ),
    ).not.toContain('color');
  });

  it('lists with the member count', () => {
    const list = [
      { ...quanTri, member_count: 1 },
      { ...everyone, member_count: 24 },
    ];
    expect(RoleListResponse.parse(list)).toEqual(list);
    expect(RoleListResponse.safeParse([quanTri]).success).toBe(false);
  });
});

describe('role requests', () => {
  it('creates with a checked name only', () => {
    expect(CreateRoleRequest.parse({ name: ' Trưởng nhóm ' })).toEqual({
      name: 'Trưởng nhóm',
    });
    expect(CreateRoleRequest.safeParse({ name: '@here' }).success).toBe(false);
  });

  it('updates any of name, permissions, is_mentionable, but not nothing', () => {
    expect(
      UpdateRoleRequest.parse({ permissions: toPermissionBitmap(P.CONNECT) }),
    ).toEqual({ permissions: String(P.CONNECT) });
    expect(UpdateRoleRequest.parse({ is_mentionable: true })).toEqual({
      is_mentionable: true,
    });
    expect(UpdateRoleRequest.safeParse({}).success).toBe(false);
    expect(UpdateRoleRequest.safeParse({ color: 3 }).success).toBe(false);
    expect(UpdateRoleRequest.safeParse({ name: 'everyone' }).success).toBe(
      false,
    );
  });

  it('reorders roles above @everyone only', () => {
    expect(
      UpdateRolePositionsRequest.parse([{ id: '101', position: 1 }]),
    ).toEqual([{ id: '101', position: 1 }]);
    expect(
      UpdateRolePositionsRequest.safeParse([{ id: '100', position: 0 }])
        .success,
    ).toBe(false);
    expect(UpdateRolePositionsRequest.safeParse([]).success).toBe(false);
  });

  it('caps a server at 250 roles (REQ-ROLE-01)', () => {
    expect(MAX_ROLES_PER_SERVER).toBe(250);
  });
});

describe('channel permission overwrites', () => {
  it('rides on every channel', () => {
    expect(ChannelResponse.parse(thongBao)).toEqual(thongBao);
    const { permission_overwrites: _, ...bare } = thongBao;
    expect(ChannelResponse.safeParse(bare).success).toBe(false);
  });

  it('puts allow and deny for a role or a member', () => {
    const body = {
      target_type: 'member',
      allow: toPermissionBitmap(P.SEND_MESSAGES),
      deny: '0',
    };
    expect(PutChannelPermissionRequest.parse(body)).toEqual(body);
    expect(
      PermissionOverwrite.safeParse({ ...body, target_id: '7' }).success,
    ).toBe(true);
  });

  it('refuses a bit both allowed and denied (DDL CHECK)', () => {
    const bit = toPermissionBitmap(P.SEND_MESSAGES);
    expect(
      PutChannelPermissionRequest.safeParse({
        target_type: 'role',
        allow: bit,
        deny: bit,
      }).success,
    ).toBe(false);
  });

  it('fails a bad bitmap on its field without throwing', () => {
    const r = PutChannelPermissionRequest.safeParse({
      target_type: 'role',
      allow: 'x',
      deny: '0',
    });
    expect(r.error?.issues.map((i) => i.path)).toEqual([['allow']]);
  });
});

describe('the full server lets the app compute permissions', () => {
  const server = ServerResponse.parse({
    id: '100',
    name: 'Ôn thi THPT 2026',
    icon_url: null,
    owner_id: '1',
    template: 'study_server',
    system_channel_id: null,
    member_count: 24,
    created_at: '2026-11-05T08:00:00.000Z',
    channels: [thongBao],
    roles: [quanTri, everyone],
    me: { role_ids: ['101'] },
  });

  const canSend = (userId: string, roleIds: readonly string[]) => {
    const channel = server.channels[0]!;
    const perms = computeChannelPermissions(
      {
        id: server.id,
        ownerId: server.owner_id,
        roles: server.roles.map(toPermissionRole),
      },
      { userId, roleIds },
      {
        type: channel.type,
        overwrites: channel.permission_overwrites.map(toPermissionOverwrite),
      },
    );
    return hasPermission(perms, P.SEND_MESSAGES);
  };

  it('Tuấn (Quản trị) posts in #thong-bao, a plain member does not', () => {
    expect(canSend('2', server.me.role_ids)).toBe(true);
    expect(canSend('3', [])).toBe(false);
  });
});

describe('SERVER_ROLE_* events (SRS 5.4)', () => {
  it('parses create and update with the server id', () => {
    for (const t of ['SERVER_ROLE_CREATE', 'SERVER_ROLE_UPDATE'] as const) {
      const d = { server_id: '100', role: quanTri };
      expect(parseDispatch({ op: 0, s: 4, t, d })).toEqual({ t, s: 4, d });
    }
  });

  it('parses delete by role id', () => {
    const d = { server_id: '100', role_id: '101' };
    expect(parseDispatch({ op: 0, s: 5, t: 'SERVER_ROLE_DELETE', d })).toEqual({
      t: 'SERVER_ROLE_DELETE',
      s: 5,
      d,
    });
  });

  it('throws on a role without its bitmap', () => {
    const { permissions: _, ...role } = quanTri;
    expect(() =>
      parseDispatch({
        op: 0,
        s: 6,
        t: 'SERVER_ROLE_UPDATE',
        d: { server_id: '100', role },
      }),
    ).toThrow();
  });
});
