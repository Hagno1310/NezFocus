import { DEFAULT_EVERYONE_PERMISSIONS, Permission } from '@nezfocus/shared';
import { buildServer } from './server-templates.js';

const ids = () => {
  let n = 100n;
  return () => n++;
};
const now = new Date('2026-10-18T13:12:00.000Z');

describe('buildServer (REQ-SRV-01)', () => {
  it('AC1 + AC4: template general has Kênh chung, #general, Phòng thoại chung (off), @everyone; #general welcomes', () => {
    const rows = buildServer('general', {
      name: 'CLB Guitar PTIT',
      ownerId: 1n,
      now,
      nextId: ids(),
    });

    expect(rows.server).toMatchObject({
      id: 100n,
      name: 'CLB Guitar PTIT',
      ownerId: 1n,
      template: 'general',
    });
    expect(rows.roles).toEqual([
      {
        id: 100n, // @everyone id = server id
        serverId: 100n,
        name: '@everyone',
        permissions: DEFAULT_EVERYONE_PERMISSIONS, // 8.5.3
        position: 0,
        createdAt: now,
      },
    ]);
    const shape = rows.channels.map((c) => [
      c.type,
      c.name,
      c.parentId,
      c.focusControl,
    ]);
    const category = rows.channels[0]!.id;
    expect(shape).toEqual([
      [0, 'Kênh chung', null, 'off'],
      [1, 'general', category, 'off'],
      [2, 'Phòng thoại chung', category, 'off'],
    ]);
    expect(rows.server.systemChannelId).toBe(rows.channels[1]!.id);
    expect(rows.ownerRoleIds).toEqual([]);
    expect(rows.overwrites).toEqual([]);
  });

  it('study_server (STUDY-05, seed only in P1): #chao-mung welcomes, two Phòng học, Trưởng nhóm for the Owner', () => {
    const rows = buildServer('study_server', {
      name: 'Ôn thi Giải tích 2',
      ownerId: 1n,
      now,
      nextId: ids(),
    });

    expect(rows.channels.map((c) => c.name)).toEqual([
      'THÔNG TIN',
      'chao-mung',
      'thong-bao',
      'tai-lieu',
      'hoi-dap',
      'viec-nhom',
      'PHÒNG HỌC',
      'Phòng học im lặng',
      'Phòng thảo luận nhóm',
    ]);
    expect(
      rows.channels.filter((c) => c.type === 2).map((c) => c.focusControl),
    ).toEqual(['everyone', 'everyone']);
    expect(rows.server.systemChannelId).toBe(rows.channels[1]!.id);
    const lead = rows.roles.find((r) => r.name === 'Trưởng nhóm')!;
    expect(lead.permissions).toBe(
      Permission.MANAGE_STUDY_ROOMS |
        Permission.MANAGE_TASKS |
        Permission.MANAGE_EVENTS |
        Permission.MANAGE_MESSAGES |
        Permission.MODERATE_MEMBERS |
        Permission.KICK_MEMBERS,
    );
    expect(rows.ownerRoleIds).toEqual([lead.id]);
  });

  it('8.5.3: #thong-bao has its own @everyone deny SEND_MESSAGES, so it is not synced', () => {
    const rows = buildServer('study_server', {
      name: 'Ôn thi Giải tích 2',
      ownerId: 1n,
      now,
      nextId: ids(),
    });
    const news = rows.channels.find((c) => c.name === 'thong-bao')!;
    expect(rows.overwrites).toEqual([
      {
        channelId: news.id,
        targetId: rows.server.id, // @everyone
        targetType: 0,
        allow: 0n,
        deny: Permission.SEND_MESSAGES,
      },
    ]);
    expect(
      rows.channels.filter((c) => !c.permissionsSynced).map((c) => c.name),
    ).toEqual(['thong-bao']);
  });

  it('numbers channels by position inside their group', () => {
    const rows = buildServer('study_server', {
      name: 'Ôn thi Giải tích 2',
      ownerId: 1n,
      now,
      nextId: ids(),
    });
    expect(rows.channels.map((c) => c.position)).toEqual([
      0, 0, 1, 2, 3, 4, 1, 0, 1,
    ]);
  });
});
