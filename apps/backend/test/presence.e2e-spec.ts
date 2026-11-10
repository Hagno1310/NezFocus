import type { INestApplication } from '@nestjs/common';
import { GatewayOp, SoloRoutes, type PresenceEvent } from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { buildServer } from '../src/modules/servers/server-templates.js';
import { ServersRepository } from '../src/modules/servers/servers.repository.js';
import { serverMembers } from '../src/modules/servers/servers.schema.js';
import { userSettings } from '../src/modules/users/users.schema.js';
import {
  CapturingMailer,
  completion,
  connectGateway,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

// P1-B4.2 REQ-AUTH-05 through two real Gateway connections. Needs `pnpm dev:infra`.
describe('Presence (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const signedIn = async () => {
    const s = await signInWithCode(app, mailer, uniqueEmail());
    await http(app)
      .post('/auth/complete-account')
      .auth(s.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    return { id: s.user.id, userId: BigInt(s.user.id), token: s.access_token };
  };

  // An and Bình share a Study Server.
  const pair = async () => {
    const an = await signedIn();
    const binh = await signedIn();
    const ids = app.get(SnowflakeGenerator);
    const rows = buildServer('study_server', {
      name: 'Ôn thi Giải tích 2',
      ownerId: an.userId,
      now: new Date(),
      nextId: () => ids.next(),
    });
    await app.get(ServersRepository).create(rows, 100);
    await db
      .insert(serverMembers)
      .values({ serverId: rows.server.id!, userId: binh.userId });
    return { an, binh };
  };

  const about = (userId: string, status?: string) => (d: unknown) =>
    (d as PresenceEvent).user_id === userId &&
    (!status || (d as PresenceEvent).status === status);

  it('AUTH-05: Bình sees An come online, Invisible as offline (AC2), afk as idle (AC1)', async () => {
    const { an, binh } = await pair();
    const b = await connectGateway(app, binh.token);
    const a = await connectGateway(app, an.token);
    await b.next('PRESENCE_UPDATE', about(an.id, 'online'));

    a.send(GatewayOp.PRESENCE_UPDATE, { status: 'online', afk: true });
    await b.next('PRESENCE_UPDATE', about(an.id, 'idle'));

    a.send(GatewayOp.PRESENCE_UPDATE, { status: 'invisible' });
    const off = await b.next('PRESENCE_UPDATE', about(an.id, 'offline'));
    expect(off.d).toEqual({
      user_id: an.id,
      status: 'offline',
      activity: null,
    });
    const [row] = await db
      .select({ s: userSettings.preferredStatus })
      .from(userSettings)
      .where(eq(userSettings.userId, an.userId));
    expect(row?.s).toBe('invisible');
    a.close();
    b.close();
  });

  it('CR-24: An learning alone reaches Bình as activity solo; Stop clears it', async () => {
    const { an, binh } = await pair();
    const b = await connectGateway(app, binh.token);
    const a = await connectGateway(app, an.token);
    await b.next('PRESENCE_UPDATE', about(an.id, 'online'));

    const api = http(app);
    const bearer = { type: 'bearer' as const };
    const started = await api
      .post(SoloRoutes.start)
      .auth(an.token, bearer)
      .send({ cycle_config: { focus_min: 25, short_break_min: 5 } })
      .expect(201);
    const withSolo = await b.next(
      'PRESENCE_UPDATE',
      (d) => about(an.id)(d) && (d as PresenceEvent).activity !== null,
    );
    expect((withSolo.d as PresenceEvent).activity).toMatchObject({
      kind: 'solo',
      phase: 'focus',
      state: 'running',
    });

    const seen = b.dispatches.length;
    await api
      .patch(SoloRoutes.byId(started.body.solo_session.id))
      .auth(an.token, bearer)
      .send({ action: 'stop' })
      .expect(200);
    await b.next(
      'PRESENCE_UPDATE',
      (d) =>
        about(an.id)(d) &&
        (d as PresenceEvent).activity === null &&
        b.dispatches.findIndex((x) => x.d === d) >= seen,
    );
    a.close();
    b.close();
  });

  it('AC3: An disconnects → Bình gets offline within 60 s', async () => {
    const { an, binh } = await pair();
    const b = await connectGateway(app, binh.token);
    const a = await connectGateway(app, an.token);
    await b.next('PRESENCE_UPDATE', about(an.id, 'online'));
    const closedAt = Date.now();
    a.close();
    const off = await waitFor(b, about(an.id, 'offline'), 15_000);
    expect(off.at - closedAt).toBeLessThanOrEqual(60_000);
    b.close();
  }, 20_000);

  // connectGateway's next() gives up after 3 s; the sweep runs every 10 s.
  const waitFor = async (
    c: Awaited<ReturnType<typeof connectGateway>>,
    where: (d: unknown) => boolean,
    ms: number,
  ) => {
    const end = Date.now() + ms;
    for (;;) {
      const hit = c.dispatches.find(
        (x) => x.t === 'PRESENCE_UPDATE' && where(x.d),
      );
      if (hit) return hit;
      if (Date.now() > end) throw new Error('no PRESENCE_UPDATE');
      await new Promise((r) => setTimeout(r, 200));
    }
  };
});
