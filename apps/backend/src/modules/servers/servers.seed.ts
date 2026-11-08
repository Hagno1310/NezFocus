import { MAX_SERVERS_PER_USER, type ServerTemplate } from '@nezfocus/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { SeedContext } from '../../db/seed.js';
import { SAMPLE_USERS } from '../users/users.seed.js';
import { users } from '../users/users.schema.js';
import { buildServer } from './server-templates.js';
import { ServersRepository } from './servers.repository.js';
import { serverMembers, servers } from './servers.schema.js';

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
export async function seedServers({ db, ids }: SeedContext) {
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
}
