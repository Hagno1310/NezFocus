import type { INestApplication } from '@nestjs/common';
import {
  AccountRoutes,
  AuthRoutes,
  DmRoutes,
  ErrorCode,
  InviteRoutes,
  MemberRoutes,
  ServerRoutes,
  type AccountDeletionPreview,
  type CurrentUser,
  type ServerMember,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import { friendships } from '../src/modules/friends/friends.schema.js';
import {
  serverMembers,
  servers,
} from '../src/modules/servers/servers.schema.js';
import { userStudyStreaks } from '../src/modules/study/study.schema.js';
import { AccountDeletionService } from '../src/modules/users/account-deletion.service.js';
import { users } from '../src/modules/users/users.schema.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const PASSWORD = completion('x').password;
const DAY_MS = 24 * 60 * 60_000;

// REQ-AUTH-10 (P3-A4.3 #132) through REST and Postgres. Needs `pnpm dev:infra`.
describe('Account deletion (e2e)', () => {
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

  const signedIn = async (displayName: string) => {
    const username = uniqueUsername();
    const email = uniqueEmail();
    const session = await signInWithCode(app, mailer, email);
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send({ ...completion(username), display_name: displayName })
      .expect(200);
    const auth = { type: 'bearer' as const };
    const api = http(app);
    const token = session.access_token;
    return {
      userId: BigInt(session.user.id),
      id: session.user.id,
      email,
      username,
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      delete: (path: string) => api.delete(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const code = (res: { body: { code?: number } }) => res.body.code;
  const newServer = async (owner: Me, name: string) =>
    (
      await owner
        .post(ServerRoutes.create)
        .send({ name, template: 'general' })
        .expect(201)
    ).body as ServerResponse;
  const join = (server: ServerResponse, who: Me) =>
    db
      .insert(serverMembers)
      .values({ serverId: BigInt(server.id), userId: who.userId });
  const statusOf = async (who: Me) =>
    (
      await db
        .select({ status: users.accountStatus })
        .from(users)
        .where(eq(users.id, who.userId))
    )[0]!.status;
  const login = (who: Me) =>
    http(app)
      .post(AuthRoutes.login)
      .send({ email: who.email, password: PASSWORD, device: device() });
  const requestedDaysAgo = (who: Me, days: number) =>
    db
      .update(users)
      .set({ deletionRequestedAt: new Date(Date.now() - days * DAY_MS) })
      .where(eq(users.id, who.userId));

  it('AC2 (âm): Owner of a server with other members → preview lists it, DELETE → 40010 with the list', async () => {
    const [an, binh] = await Promise.all([signedIn('An'), signedIn('Bình')]);
    const shared = await newServer(an, 'Ôn thi Giải tích 2');
    await join(shared, binh);
    const solo = await newServer(an, 'Góc tự học của An');

    const preview = (await an.get(AccountRoutes.deletion).expect(200))
      .body as AccountDeletionPreview;
    expect(preview.owned_servers).toEqual([
      {
        id: shared.id,
        name: 'Ôn thi Giải tích 2',
        icon_url: null,
        member_count: 2,
      },
    ]);
    expect(preview.solo_servers.map((s) => s.id)).toEqual([solo.id]);

    const res = await an
      .delete(AccountRoutes.me)
      .send({ password: PASSWORD })
      .expect(409);
    expect(code(res)).toBe(ErrorCode.OwnershipTransferRequired);
    expect(res.body.owned_servers).toEqual(preview.owned_servers);
    expect(await statusOf(an)).toBe('active');
  });

  it('AC8 (âm): wrong password → 40102, the 5th in 10 minutes → 40029', async () => {
    const an = await signedIn('An');
    const wrong = () =>
      an.delete(AccountRoutes.me).send({ password: 'Sai2026!' });
    for (let i = 0; i < 4; i++)
      expect(code(await wrong())).toBe(ErrorCode.InvalidCredentials);
    expect(code(await wrong())).toBe(ErrorCode.RateLimited);
    expect(await statusOf(an)).toBe('active');
  });

  it('AC1, AC5, AC6, AC7: right password → pending, sessions end, solo server and its invites gone, others see a deleted account', async () => {
    const [an, binh] = await Promise.all([signedIn('An'), signedIn('Bình')]);
    const solo = await newServer(an, 'Góc tự học của An');
    const text = solo.channels.find((c) => c.type === 'text')!;
    const invite = (
      await an
        .post(InviteRoutes.create.replace(':id', text.id))
        .send({})
        .expect(201)
    ).body as { code: string };
    const shared = await newServer(binh, 'Nhóm đồ án Mobile');
    await join(shared, an);

    await an.delete(AccountRoutes.me).send({ password: PASSWORD }).expect(204);

    expect(await statusOf(an)).toBe('pending_deletion');
    expect(code(await an.get(AccountRoutes.me))).toBe(ErrorCode.TokenInvalid);
    expect(
      code(await binh.get(InviteRoutes.byCode.replace(':code', invite.code))),
    ).toBe(ErrorCode.InviteInvalid);
    // AC5: still a member, shown as a deleted account.
    const members = (
      await binh.get(MemberRoutes.list.replace(':id', shared.id)).expect(200)
    ).body as { members: ServerMember[] } | ServerMember[];
    const list = Array.isArray(members) ? members : members.members;
    expect(list.find((m) => m.user.id === an.id)?.user).toMatchObject({
      username: null,
      display_name: null,
      avatar: null,
    });
    // AC6: no new DM.
    expect(
      code(await binh.post(DmRoutes.create).send({ recipient_id: an.id })),
    ).toBe(ErrorCode.CannotMessageUser);
  });

  it('AC4: logging in again shows the date; cancel → active, the solo server back, its old invite still 40041', async () => {
    const an = await signedIn('An');
    const solo = await newServer(an, 'Góc tự học của An');
    const text = solo.channels.find((c) => c.type === 'text')!;
    const invite = (
      await an
        .post(InviteRoutes.create.replace(':id', text.id))
        .send({})
        .expect(201)
    ).body as { code: string };
    await an.delete(AccountRoutes.me).send({ password: PASSWORD }).expect(204);

    const back = await login(an).expect(200);
    const user = back.body.user as CurrentUser;
    expect(user.deletion_scheduled_at).not.toBeNull();
    const token = back.body.access_token as string;
    await http(app)
      .delete(AccountRoutes.deletion)
      .auth(token, { type: 'bearer' })
      .expect(204);

    expect(await statusOf(an)).toBe('active');
    const me = (
      await http(app)
        .get(AccountRoutes.me)
        .auth(token, { type: 'bearer' })
        .expect(200)
    ).body as CurrentUser;
    expect(me.deletion_scheduled_at).toBeNull();
    await http(app)
      .get(ServerRoutes.byId.replace(':id', solo.id))
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(
      code(
        await http(app)
          .get(InviteRoutes.byCode.replace(':code', invite.code))
          .auth(token, { type: 'bearer' }),
      ),
    ).toBe(ErrorCode.InviteInvalid);
  });

  it('AC3: after 14 days the purge erases PII, friendships, study data and memberships; the username is free', async () => {
    const [an, binh] = await Promise.all([signedIn('An'), signedIn('Bình')]);
    const shared = await newServer(binh, 'Nhóm đồ án Mobile');
    await join(shared, an);
    const [low, high] =
      an.userId < binh.userId
        ? [an.userId, binh.userId]
        : [binh.userId, an.userId];
    await db.insert(friendships).values({
      userIdLow: low,
      userIdHigh: high,
      status: 1,
      requestedBy: an.userId,
    });
    await db.insert(userStudyStreaks).values({
      userId: an.userId,
      currentStreakDays: 6,
      longestStreakDays: 6,
    });
    await an.delete(AccountRoutes.me).send({ password: PASSWORD }).expect(204);
    await requestedDaysAgo(an, 13);
    const purge = () => app.get(AccountDeletionService).purge();
    expect(await purge()).not.toContain(an.userId);

    await requestedDaysAgo(an, 15);
    expect(await purge()).toContain(an.userId);

    const [row] = await db.select().from(users).where(eq(users.id, an.userId));
    expect(row).toMatchObject({
      accountStatus: 'deleted',
      email: null,
      username: null,
      displayName: null,
      avatarKey: null,
      bio: null,
      passwordHash: null,
    });
    expect(
      await db
        .select()
        .from(serverMembers)
        .where(eq(serverMembers.userId, an.userId)),
    ).toEqual([]);
    expect(
      await db.select().from(friendships).where(eq(friendships.userIdLow, low)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(userStudyStreaks)
        .where(eq(userStudyStreaks.userId, an.userId)),
    ).toEqual([]);
    expect(code(await login(an))).toBe(ErrorCode.InvalidCredentials);
    await db
      .update(users)
      .set({ username: an.username })
      .where(eq(users.id, binh.userId))
      .catch(() => {
        throw new Error('username still taken');
      });
    expect(
      (
        await db
          .select()
          .from(servers)
          .where(eq(servers.id, BigInt(shared.id)))
      ).length,
    ).toBe(1);
  });
});
