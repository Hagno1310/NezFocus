import {
  MAX_SERVERS_PER_USER,
  Permission,
  permissionBits,
  type ServerTemplate,
} from '@nezfocus/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { SeedContext } from '../../db/seed.js';
import { SAMPLE_USERS } from '../users/users.seed.js';
import { users } from '../users/users.schema.js';
import { buildServer } from './server-templates.js';
import { ServersRepository } from './servers.repository.js';
import {
  OverwriteTargetCode,
  channelPermissionOverwrites,
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
} from './servers.schema.js';

// docs/design/screens/README.md › Bộ dữ liệu mẫu. An owns all three; order = rail order.
export const SAMPLE_SERVERS: {
  name: string;
  template: ServerTemplate;
  createdAt: string;
  members: string[]; // besides An
}[] = [
  {
    name: 'Ôn thi Giải tích 2',
    template: 'study_server', // inserted directly: the API opens this template in P4-A2 (#168)
    createdAt: '2026-10-01T01:00:00.000Z', // An: "Thành viên từ 01/10/2026"
    members: SAMPLE_USERS.map((u) => u.username).filter(
      (u) => u !== 'an.nguyen',
    ),
  },
  {
    name: 'Nhóm đồ án Mobile',
    template: 'study_server',
    createdAt: '2026-10-05T01:00:00.000Z',
    members: ['dung.pham', 'tuan.hoang', 'vu.dang'],
  },
  {
    name: 'CLB Guitar PTIT',
    template: 'general',
    createdAt: '2026-10-10T01:00:00.000Z',
    members: ['binh.tran', 'lan.vu'],
  },
];

// A server An already owns under the same name is left alone, so reruns add nothing.
// "Server ưu tiên" on by default for Study Server members is REQ-STUDY-09, v1.x: not seeded.
export async function seedServers(ctx: SeedContext) {
  const { db, ids } = ctx;
  const people = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      inArray(
        users.username,
        SAMPLE_USERS.map((u) => u.username),
      ),
    );
  const idOf = new Map(people.map((p) => [p.username, p.id]));
  const an = idOf.get('an.nguyen');
  if (!an) return console.warn('servers: no an.nguyen, skipped');

  const repo = new ServersRepository(db);
  let created = 0;
  for (const sample of SAMPLE_SERVERS) {
    const [existing] = await db
      .select({ id: servers.id })
      .from(servers)
      .where(and(eq(servers.ownerId, an), eq(servers.name, sample.name)));
    if (existing) continue;

    const start = new Date(sample.createdAt);
    const rows = buildServer(sample.template, {
      name: sample.name,
      ownerId: an,
      now: start,
      nextId: () => ids.next(),
    });
    if (!(await repo.create(rows, MAX_SERVERS_PER_USER))) continue;
    const members = sample.members.flatMap((username, i) => {
      const userId = idOf.get(username);
      // Joined after An, one minute apart.
      const joinedAt = new Date(start.getTime() + (i + 1) * 60_000);
      return userId ? [{ serverId: rows.server.id!, userId, joinedAt }] : [];
    });
    if (members.length) await db.insert(serverMembers).values(members);
    created++;
  }
  console.log(
    `servers: ${created} created, ${SAMPLE_SERVERS.length - created} already there`,
  );
  await seedSampleRoles(ctx, an, idOf);
  await seedAnnouncements(ctx, an);
}

// SRS 8.5.3 for Study Servers seeded before overwrites existed: #thong-bao still synced and
// without overwrites gets its own @everyone deny SEND_MESSAGES. Reruns find it done.
async function seedAnnouncements({ db }: SeedContext, an: bigint) {
  const names = SAMPLE_SERVERS.filter((s) => s.template === 'study_server').map(
    (s) => s.name,
  );
  const found = await db
    .select({ id: channels.id, serverId: channels.serverId })
    .from(channels)
    .innerJoin(servers, eq(servers.id, channels.serverId))
    .where(
      and(
        eq(servers.ownerId, an),
        inArray(servers.name, names),
        eq(channels.name, 'thong-bao'),
        eq(channels.permissionsSynced, true),
        isNull(channels.deletedAt),
      ),
    );
  for (const { id, serverId } of found) {
    const [own] = await db
      .select({ id: channelPermissionOverwrites.channelId })
      .from(channelPermissionOverwrites)
      .where(eq(channelPermissionOverwrites.channelId, id));
    if (own) continue;
    await db
      .update(channels)
      .set({ permissionsSynced: false })
      .where(eq(channels.id, id));
    await db.insert(channelPermissionOverwrites).values({
      channelId: id,
      targetId: serverId!, // @everyone
      targetType: OverwriteTargetCode.role,
      deny: Permission.SEND_MESSAGES,
    });
  }
}

// Spec 08 › Quy ước chung: Quản trị (Tuấn) > Trưởng nhóm (An, Bình) > Điều phối phòng học
// (Chi) > @everyone. Added by name, so it also fills a server seeded before roles existed.
const SAMPLE_ROLES = [
  {
    name: 'Điều phối phòng học',
    position: 1,
    permissions: permissionBits('MANAGE_STUDY_ROOMS'),
    holders: ['chi.le'],
  },
  { name: 'Trưởng nhóm', position: 2, holders: ['an.nguyen', 'binh.tran'] },
  {
    name: 'Quản trị',
    position: 3,
    permissions: permissionBits(
      'MANAGE_ROLES',
      'MANAGE_CHANNELS',
      'KICK_MEMBERS',
      'BAN_MEMBERS',
      'MODERATE_MEMBERS',
      'MANAGE_MESSAGES',
    ),
    holders: ['tuan.hoang'],
  },
];

async function seedSampleRoles(
  { db, ids }: SeedContext,
  an: bigint,
  idOf: Map<string | null, bigint>,
) {
  const [server] = await db
    .select({ id: servers.id })
    .from(servers)
    .where(
      and(eq(servers.ownerId, an), eq(servers.name, SAMPLE_SERVERS[0]!.name)),
    );
  if (!server) return;
  const existing = await db
    .select()
    .from(roles)
    .where(eq(roles.serverId, server.id));
  // Seeded once: a rerun leaves the roles (and any reorder made since) alone.
  if (existing.some((r) => r.name === 'Quản trị')) return;
  for (const sample of SAMPLE_ROLES) {
    let role = existing.find((r) => r.name === sample.name);
    if (role)
      await db // the template's Trưởng nhóm, from 1 to its place in the sample
        .update(roles)
        .set({ position: sample.position })
        .where(eq(roles.id, role.id));
    else
      [role] = await db
        .insert(roles)
        .values({
          id: ids.next(),
          serverId: server.id,
          name: sample.name,
          position: sample.position,
          permissions: sample.permissions ?? 0n,
        })
        .returning();
    const holders = sample.holders.flatMap((u) => {
      const userId = idOf.get(u);
      return userId ? [{ serverId: server.id, userId, roleId: role!.id }] : [];
    });
    if (holders.length)
      await db.insert(serverMemberRoles).values(holders).onConflictDoNothing();
  }
}
