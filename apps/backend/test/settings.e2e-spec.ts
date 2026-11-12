import type { INestApplication } from '@nestjs/common';
import {
  SettingsRoutes,
  DEFAULT_USER_SETTINGS,
  ErrorCode,
  SoloRoutes,
  type PresenceEvent,
  type Ready,
  type UserSettings,
} from '@nezfocus/shared';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { buildServer } from '../src/modules/servers/server-templates.js';
import { ServersRepository } from '../src/modules/servers/servers.repository.js';
import { serverMembers } from '../src/modules/servers/servers.schema.js';
import { SettingsService } from '../src/modules/users/settings.service.js';
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

// P1-A5.1: PATCH /users/@me/settings through HTTP, Postgres and the Gateway (SRS 5.3, 5.4,
// 8.2; REQ-STUDY-03, DM-02, AUTH-05). Needs `pnpm dev:infra`.
describe('User settings (e2e)', () => {
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
  const patch = (token: string, body: object) =>
    http(app)
      .patch(SettingsRoutes.settings)
      .auth(token, { type: 'bearer' })
      .send(body);

  // A server owned by `owner`, with `others` as members.
  const server = async (owner: bigint, ...others: bigint[]) => {
    const ids = app.get(SnowflakeGenerator);
    const rows = buildServer('general', {
      name: 'CLB Guitar PTIT',
      ownerId: owner,
      now: new Date(),
      nextId: () => ids.next(),
    });
    await app.get(ServersRepository).create(rows, 100);
    for (const userId of others)
      await db
        .insert(serverMembers)
        .values({ serverId: rows.server.id!, userId });
    return rows.server.id!;
  };

  it('READY carries the settings; a change reaches my other session as USER_SETTINGS_UPDATE', async () => {
    const an = await signedIn();
    const phone = await connectGateway(app, an.token);
    expect((phone.ready() as Ready).settings).toEqual(DEFAULT_USER_SETTINGS);

    const res = await patch(an.token, {
      theme: 'light',
      locale: 'en',
      hide_push_content: true,
      focus_sound_always: true,
    }).expect(200);
    expect(res.body).toMatchObject({
      theme: 'light',
      locale: 'en',
      hide_push_content: true,
      focus_sound_always: true,
      timezone: 'Asia/Ho_Chi_Minh',
    });
    const update = await phone.next('USER_SETTINGS_UPDATE');
    expect(update.d).toEqual(res.body);
    phone.close();
  });

  it('a theme / language sent late (offline, then synced) still overwrites, no limit', async () => {
    const an = await signedIn();
    for (const theme of ['dark', 'light', 'system', 'dark'])
      await patch(an.token, { theme }).expect(200);
    const res = await patch(an.token, { locale: 'en' }).expect(200);
    expect(res.body).toMatchObject({ theme: 'dark', locale: 'en' });
  });

  it.each([
    [{ theme: 'blue' }, 'theme'],
    [{ timezone: 'Mars/Olympus' }, 'timezone'],
    [{ show_on_leaderboard: false }, '_'], // v1.x field, not taken in MVP
  ])('a wrong value %o → 40001 with the field', async (body, field) => {
    const an = await signedIn();
    const res = await patch(an.token, body).expect(400);
    expect(res.body.code).toBe(ErrorCode.ValidationError);
    expect(Object.keys(res.body.errors)).toContain(field);
  });

  describe('REQ-DM-02 per server', () => {
    it('turns DMs off in a server I am in; it shows in my settings', async () => {
      const an = await signedIn();
      const guitar = await server(an.userId);
      const res = await patch(an.token, {
        server_allow_dm: { [guitar.toString()]: false },
      }).expect(200);
      expect(res.body.server_allow_dm).toEqual({ [guitar.toString()]: false });

      // The switch off and on again keeps the override (S-ME-04 `dm-off`).
      await patch(an.token, { allow_dm_from_server_members: false }).expect(
        200,
      );
      const back = await patch(an.token, {
        allow_dm_from_server_members: true,
      }).expect(200);
      expect(back.body.server_allow_dm).toEqual({
        [guitar.toString()]: false,
      });
    });

    it('a server I am not in → 40001', async () => {
      const an = await signedIn();
      const binh = await signedIn();
      const theirs = await server(binh.userId);
      const res = await patch(an.token, {
        server_allow_dm: { [theirs.toString()]: false },
      }).expect(400);
      expect(res.body.code).toBe(ErrorCode.ValidationError);
      expect(res.body.errors.server_allow_dm).toBeDefined();
    });

    it('the read function for DmAccessPolicy: switch, then overrides', async () => {
      const an = await signedIn();
      const guitar = await server(an.userId);
      const giaiTich = await server(an.userId);
      const settings = app.get(SettingsService);
      await patch(an.token, {
        server_allow_dm: { [guitar.toString()]: false },
      }).expect(200);
      expect(
        await settings.acceptsDmFromServerMembers(an.userId, [guitar]),
      ).toBe(false);
      expect(
        await settings.acceptsDmFromServerMembers(an.userId, [
          guitar,
          giaiTich,
        ]),
      ).toBe(true);
      await patch(an.token, { allow_dm_from_server_members: false }).expect(
        200,
      );
      expect(
        await settings.acceptsDmFromServerMembers(an.userId, [giaiTich]),
      ).toBe(false);
    });
  });

  describe('REQ-STUDY-03 time zone', () => {
    it('AC7: the first change after Complete account (same day) works; AC4: the second → 40029', async () => {
      const an = await signedIn();
      const phone = await connectGateway(app, an.token);
      const first = await patch(an.token, { timezone: 'Asia/Tokyo' }).expect(
        200,
      );
      const settings = first.body as UserSettings;
      expect(settings.timezone).toBe('Asia/Tokyo');
      expect(settings.timezone_changed_at).not.toBeNull();
      // "Today" moves: the streak is announced again.
      await phone.next('STREAK_UPDATE');

      const second = await patch(an.token, { timezone: 'Asia/Seoul' }).expect(
        429,
      );
      expect(second.body.code).toBe(ErrorCode.RateLimited);
      // Allowed again 24 hours after the first change.
      const retryAfter = second.body.retry_after as number;
      expect(retryAfter).toBeGreaterThan(24 * 3600 - 60);
      expect(retryAfter).toBeLessThanOrEqual(24 * 3600);
      expect(second.headers['retry-after']).toBe(String(retryAfter));
      phone.close();
    });

    it('a locked time zone changes nothing else in the same request', async () => {
      const an = await signedIn();
      await patch(an.token, { timezone: 'Asia/Tokyo' }).expect(200);
      await patch(an.token, { timezone: 'Asia/Seoul', theme: 'light' }).expect(
        429,
      );
      const res = await patch(an.token, { locale: 'vi' }).expect(200);
      expect(res.body).toMatchObject({
        timezone: 'Asia/Tokyo',
        theme: 'system',
      });
    });

    it('sending the zone in use is not a change: no new mark, a real change still works', async () => {
      const an = await signedIn();
      const same = await patch(an.token, {
        timezone: 'Asia/Ho_Chi_Minh',
      }).expect(200);
      expect(same.body.timezone_changed_at).toBeNull();
      await patch(an.token, { timezone: 'Asia/Tokyo' }).expect(200);
      // Once changed, re-sending Tokyo inside the 24 hours is still fine.
      await patch(an.token, { timezone: 'Asia/Tokyo' }).expect(200);
    });
  });

  it('AUTH-05: turning "Hiện hoạt động học" off while learning alone → Bình no longer gets the activity', async () => {
    const an = await signedIn();
    const binh = await signedIn();
    await server(an.userId, binh.userId);
    const b = await connectGateway(app, binh.token);
    const a = await connectGateway(app, an.token);
    const about = (d: unknown) => (d as PresenceEvent).user_id === an.id;
    await b.next('PRESENCE_UPDATE', about);

    await http(app)
      .post(SoloRoutes.start)
      .auth(an.token, { type: 'bearer' })
      .send({ cycle_config: { focus_min: 25, short_break_min: 5 } })
      .expect(201);
    await b.next(
      'PRESENCE_UPDATE',
      (d) => about(d) && (d as PresenceEvent).activity !== null,
    );

    const seen = b.dispatches.length;
    await patch(an.token, { show_study_activity: false }).expect(200);
    const hidden = await b.next(
      'PRESENCE_UPDATE',
      (d) =>
        about(d) &&
        (d as PresenceEvent).activity === null &&
        b.dispatches.findIndex((x) => x.d === d) >= seen,
    );
    expect((hidden.d as PresenceEvent).status).toBe('online');
    a.close();
    b.close();
  });
});
