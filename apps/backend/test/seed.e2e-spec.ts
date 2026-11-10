import { randomInt } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Permission } from '@nezfocus/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { runSeeds } from '../src/db/seed.js';
import { SAMPLE_SERVERS } from '../src/modules/servers/servers.seed.js';
import { StudyStatsService } from '../src/modules/study/study-stats.service.js';
import {
  channelPermissionOverwrites,
  channels,
  roles,
  serverMemberRoles,
  serverMembers,
  servers,
} from '../src/modules/servers/servers.schema.js';
import { DEV_PASSWORD, SAMPLE_USERS } from '../src/modules/users/users.seed.js';
import { users, userSettings } from '../src/modules/users/users.schema.js';
import {
  CapturingMailer,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
} from './helpers.js';

// P0-7 against the real dev schema. Needs `pnpm dev:infra`.
describe('db:seed (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const seed = () =>
    runSeeds({ db, ids: app.get(SnowflakeGenerator), now: new Date() });

  const sampleRows = () =>
    db
      .select({ username: users.username })
      .from(users)
      .where(
        inArray(
          users.username,
          SAMPLE_USERS.map((u) => u.username),
        ),
      );

  it('creates every sample account once, keeps accounts people made, and An can sign in', async () => {
    const own = await signInWithCode(app, mailer, uniqueEmail('thu'));

    await seed();
    await seed();

    const rows = await sampleRows();
    expect(rows.map((r) => r.username).sort()).toEqual(
      SAMPLE_USERS.map((u) => u.username).sort(),
    );
    const settings = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .innerJoin(users, eq(users.id, userSettings.userId))
      .where(
        inArray(
          users.username,
          SAMPLE_USERS.map((u) => u.username),
        ),
      );
    expect(settings).toHaveLength(SAMPLE_USERS.length);

    const [kept] = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, [BigInt(own.user.id)]));
    expect(kept).toBeDefined();

    const signedIn = await http(app)
      .post('/auth/login')
      .set(
        'X-Forwarded-For',
        `198.51.${randomInt(0, 256)}.${randomInt(1, 255)}`,
      )
      .send({
        email: 'an.nguyen@gmail.com',
        password: DEV_PASSWORD,
        device: device(),
      })
      .expect(200);
    expect(signedIn.body.user).toMatchObject({
      username: 'an.nguyen',
      display_name: 'An',
      account_completed: true,
    });
  });

  it('adds the sample servers once; An owns "Ôn thi Giải tích 2", a Study Server welcoming in #chao-mung', async () => {
    await seed();
    await seed();

    const [an] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, 'an.nguyen'));
    const owned = await db
      .select()
      .from(servers)
      .where(
        and(
          eq(servers.ownerId, an!.id),
          inArray(
            servers.name,
            SAMPLE_SERVERS.map((s) => s.name),
          ),
        ),
      );
    expect(owned.map((s) => s.name).sort()).toEqual(
      SAMPLE_SERVERS.map((s) => s.name).sort(),
    );

    const study = owned.find((s) => s.name === 'Ôn thi Giải tích 2')!;
    expect(study.template).toBe('study_server');
    const [welcome] = await db
      .select({ name: channels.name })
      .from(channels)
      .where(eq(channels.id, study.systemChannelId!));
    expect(welcome!.name).toBe('chao-mung');
    const members = await db
      .select({ userId: serverMembers.userId })
      .from(serverMembers)
      .where(eq(serverMembers.serverId, study.id));
    expect(members).toHaveLength(SAMPLE_USERS.length);
    const [lead] = await db
      .select({ name: roles.name })
      .from(serverMemberRoles)
      .innerJoin(roles, eq(roles.id, serverMemberRoles.roleId))
      .where(
        and(
          eq(serverMemberRoles.serverId, study.id),
          eq(serverMemberRoles.userId, an!.id),
        ),
      );
    expect(lead!.name).toBe('Trưởng nhóm');

    // Spec 08 › Quy ước chung: the sample roles, highest first, and who holds them.
    const held = await db
      .select({
        role: roles.name,
        position: roles.position,
        user: users.username,
      })
      .from(roles)
      .leftJoin(serverMemberRoles, eq(serverMemberRoles.roleId, roles.id))
      .leftJoin(users, eq(users.id, serverMemberRoles.userId))
      .where(eq(roles.serverId, study.id));
    const holders = (role: string) =>
      held
        .filter((h) => h.role === role)
        .map((h) => h.user)
        .sort();
    expect(holders('Quản trị')).toEqual(['tuan.hoang']);
    expect(holders('Trưởng nhóm')).toEqual(['an.nguyen', 'binh.tran']);
    expect(holders('Điều phối phòng học')).toEqual(['chi.le']);
    expect(
      [...new Set(held.map((h) => `${h.position} ${h.role}`))].sort(),
    ).toEqual([
      '0 @everyone',
      '1 Điều phối phòng học',
      '2 Trưởng nhóm',
      '3 Quản trị',
    ]);

    // SRS 8.5.3: #thong-bao denies @everyone SEND_MESSAGES on its own, once.
    const news = await db
      .select({
        synced: channels.permissionsSynced,
        target: channelPermissionOverwrites.targetId,
        deny: channelPermissionOverwrites.deny,
      })
      .from(channels)
      .innerJoin(
        channelPermissionOverwrites,
        eq(channelPermissionOverwrites.channelId, channels.id),
      )
      .where(
        and(eq(channels.serverId, study.id), eq(channels.name, 'thong-bao')),
      );
    expect(news).toEqual([
      { synced: false, target: study.id, deny: Permission.SEND_MESSAGES },
    ]);
  });

  it('gives An the sample minutes of 04 › Thống kê mẫu, once', async () => {
    await seed();
    await seed();
    const [an] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, 'an.nguyen'));
    const study = app.get(StudyStatsService);
    const week = await study.stats(an!.id, {
      view: 'week',
      date: '2026-10-18',
    });
    expect(week).toMatchObject({
      total_minutes: 275, // 4 giờ 35 phút
      room_minutes: 200,
      solo_minutes: 75,
      longest_streak_days: 14,
    });
    expect(week.days.map((d) => d.focused_minutes)).toEqual([
      0, 50, 40, 35, 60, 45, 45,
    ]);
    // ≥: the dev database may hold minutes An studied by hand; the seed never overwrites them.
    expect(week.all_time_minutes).toBeGreaterThanOrEqual(86 * 60 + 12);
    expect(week.first_date! < '2025-12-01').toBe(true);
    const month = await study.stats(an!.id, {
      view: 'month',
      date: '2026-10-18',
    });
    expect(month).toMatchObject({ total_minutes: 505, solo_minutes: 135 });
    const september = await study.stats(an!.id, {
      view: 'month',
      date: '2026-09-01',
    });
    expect(
      september.days.slice(0, 18).reduce((n, d) => n + d.focused_minutes, 0),
    ).toBe(550); // 9 giờ 10 phút
  });
});
