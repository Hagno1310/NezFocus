import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import {
  AccountRoutes,
  AttachmentRoutes,
  AuthRoutes,
  type CurrentUser,
  type SessionInfo,
} from '@nezfocus/shared';
import sharp from 'sharp';
import type { MemoryObjectStorage } from '../src/modules/storage/object-storage.js';
import {
  CapturingMailer,
  completion,
  connectGateway,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const PASSWORD = completion('x').password;
const sessionPath = (id: string) => AccountRoutes.session.replace(':id', id);
const completePath = (id: string) =>
  AttachmentRoutes.complete.replace(':id', id);

// REQ-AUTH-07 (sign out, sessions) and REQ-AUTH-06 (profile, avatar) through HTTP,
// Postgres, Redis and the Gateway; storage is in memory. Needs `pnpm dev:infra`.
describe('Account: sessions and profile (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let storage: MemoryObjectStorage;

  beforeAll(async () => {
    ({ app, mailer, storage } = await createTestApp());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  // A completed account signed in on "this phone" and on a tablet.
  const account = async () => {
    const email = uniqueEmail();
    const first = await signInWithCode(app, mailer, email);
    await http(app)
      .post('/auth/complete-account')
      .auth(first.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    const tablet = await http(app)
      .post(AuthRoutes.login)
      .set('X-Forwarded-For', '198.18.0.7')
      .send({
        email,
        password: PASSWORD,
        device: { ...device(), name: 'iPad của An', os_version: '17' },
      })
      .expect(200);
    return {
      me: first.access_token,
      meId: first.session_id,
      meRefresh: first.refresh_token,
      tablet: tablet.body.access_token as string,
      tabletId: tablet.body.session_id as string,
      tabletRefresh: tablet.body.refresh_token as string,
    };
  };
  const as = (token: string) => ({
    get: (p: string) => http(app).get(p).auth(token, { type: 'bearer' }),
    post: (p: string) => http(app).post(p).auth(token, { type: 'bearer' }),
    patch: (p: string) => http(app).patch(p).auth(token, { type: 'bearer' }),
    delete: (p: string) => http(app).delete(p).auth(token, { type: 'bearer' }),
  });
  const refresh = (token: string) =>
    http(app).post(AuthRoutes.refresh).send({ refresh_token: token });

  describe('sessions (REQ-AUTH-07)', () => {
    it('lists live sessions with device, platform and network part, marking this one', async () => {
      const acc = await account();
      const res = await as(acc.me).get(AccountRoutes.sessions).expect(200);
      const list = res.body as SessionInfo[];
      expect(list.map((s) => s.id).sort()).toEqual(
        [acc.meId, acc.tabletId].sort(),
      );
      expect(list.find((s) => s.current)?.id).toBe(acc.meId);
      expect(list.find((s) => s.id === acc.tabletId)).toMatchObject({
        device_name: 'iPad của An',
        platform: 'android',
        os_version: '17',
        ip_prefix: '198.18.0.0',
        current: false,
      });
    });

    it('revokes one session: its refresh token dies, its Gateway gets 4004 revoked (AC1)', async () => {
      const acc = await account();
      const gw = await connectGateway(app, acc.tablet);
      await as(acc.me).delete(sessionPath(acc.tabletId)).expect(204);
      expect(await gw.closed).toEqual({ code: 4004, reason: 'revoked' });
      const res = await refresh(acc.tabletRefresh).expect(401);
      expect(res.body).toMatchObject({ code: 40100, reason: 'revoked' });
      const list = await as(acc.me).get(AccountRoutes.sessions).expect(200);
      expect(list.body.map((s: SessionInfo) => s.id)).toEqual([acc.meId]);
    });

    it('refuses someone else’s or an ended session with 40401, and this one with 40001', async () => {
      const acc = await account();
      const other = await account();
      await as(acc.me).delete(sessionPath(other.tabletId)).expect(404);
      await as(acc.me).delete(sessionPath(acc.tabletId)).expect(204);
      await as(acc.me).delete(sessionPath(acc.tabletId)).expect(404);
      const self = await as(acc.me).delete(sessionPath(acc.meId)).expect(400);
      expect(self.body.code).toBe(40001);
      // The other account's tablet still works.
      await refresh(other.tabletRefresh).expect(200);
    });

    it('signs out every other session and keeps this one', async () => {
      const acc = await account();
      const gw = await connectGateway(app, acc.tablet);
      await as(acc.me).delete(AccountRoutes.sessions).expect(204);
      expect(await gw.closed).toEqual({ code: 4004, reason: 'revoked' });
      await refresh(acc.meRefresh).expect(200);
    });

    it('signs out here: the refresh token stops working, other devices stay (AC2)', async () => {
      const acc = await account();
      await as(acc.me).post(AuthRoutes.logout).expect(204);
      await refresh(acc.meRefresh).expect(401);
      await as(acc.me).get(AccountRoutes.me).expect(401);
      await refresh(acc.tabletRefresh).expect(200);
    });
  });

  describe('profile (REQ-AUTH-06)', () => {
    const png = (w = 600, h = 400) =>
      sharp({
        create: { width: w, height: h, channels: 3, background: '#2f6fb0' },
      })
        .png()
        .toBuffer();

    // POST /attachments → "PUT" → complete; returns the complete response.
    const upload = async (
      token: string,
      body: Buffer,
      contentType: string,
      filename = 'avatar.png',
      status = 200,
    ) => {
      const created = await as(token)
        .post(AttachmentRoutes.create)
        .send({
          purpose: 'avatar',
          filename,
          content_type: contentType,
          size_bytes: body.length,
        })
        .expect(201);
      storage.upload(created.body.upload_url, body, contentType);
      return as(token)
        .post(completePath(created.body.attachment_id))
        .expect(status);
    };

    it('uploads a png, sets it, and the profile carries the three webp sizes (AC1)', async () => {
      const acc = await account();
      const done = await upload(acc.me, await png(), 'image/png');
      expect(done.body).toMatchObject({
        purpose: 'avatar',
        content_type: 'image/png',
        width: 600,
        height: 400,
      });
      const res = await as(acc.me)
        .patch(AccountRoutes.me)
        .send({ avatar_attachment_id: done.body.id })
        .expect(200);
      const user = res.body as CurrentUser;
      expect(Object.keys(user.avatar ?? {})).toEqual(['128', '256', '512']);
      for (const size of ['128', '256', '512'] as const) {
        const file = await http(app)
          .get(user.avatar![size])
          .buffer(true)
          .parse((r, cb) => {
            const chunks: Buffer[] = [];
            r.on('data', (c: Buffer) => chunks.push(c));
            r.on('end', () => cb(null, Buffer.concat(chunks)));
          })
          .expect(200)
          .expect('Content-Type', 'image/webp');
        expect(await sharp(file.body as Buffer).metadata()).toMatchObject({
          format: 'webp',
          width: Number(size),
        });
      }
    });

    it('refuses a GIF, declared or disguised, with 40014 (AC2)', async () => {
      const acc = await account();
      const gif = await sharp({
        create: { width: 8, height: 8, channels: 3, background: '#000' },
      })
        .gif()
        .toBuffer();
      const declared = await as(acc.me)
        .post(AttachmentRoutes.create)
        .send({
          purpose: 'avatar',
          filename: 'meo.gif',
          content_type: 'image/gif',
          size_bytes: gif.length,
        })
        .expect(415);
      expect(declared.body.code).toBe(40014);
      const disguised = await upload(acc.me, gif, 'image/png', 'meo.png', 415);
      expect(disguised.body.code).toBe(40014);
    });

    it('refuses more than 8MB with 40013, declared or actual (AC3)', async () => {
      const acc = await account();
      const declared = await as(acc.me)
        .post(AttachmentRoutes.create)
        .send({
          purpose: 'avatar',
          filename: 'big.jpg',
          content_type: 'image/jpeg',
          size_bytes: 9 * 1024 * 1024,
        })
        .expect(413);
      expect(declared.body.code).toBe(40013);
      // Declares little, uploads 9MB: the bytes decide.
      const created = await as(acc.me)
        .post(AttachmentRoutes.create)
        .send({
          purpose: 'avatar',
          filename: 'liar.png',
          content_type: 'image/png',
          size_bytes: 1000,
        })
        .expect(201);
      storage.upload(created.body.upload_url, Buffer.alloc(9 * 1024 * 1024));
      const actual = await as(acc.me)
        .post(completePath(created.body.attachment_id))
        .expect(413);
      expect(actual.body.code).toBe(40013);
    });

    it('takes an iPhone HEIC photo (AC4)', async () => {
      const acc = await account();
      const heic = readFileSync(join(__dirname, 'fixtures/photo.heic'));
      const done = await upload(acc.me, heic, 'image/heic', 'IMG_0001.HEIC');
      expect(done.body.content_type).toBe('image/heic');
      await as(acc.me)
        .patch(AccountRoutes.me)
        .send({ avatar_attachment_id: done.body.id })
        .expect(200);
    });

    it('refuses an empty display name and a bio over 200 characters with 40001 (AC6)', async () => {
      const acc = await account();
      const empty = await as(acc.me)
        .patch(AccountRoutes.me)
        .send({ display_name: '   ' })
        .expect(400);
      expect(Object.keys(empty.body.errors)).toEqual(['display_name']);
      const long = await as(acc.me)
        .patch(AccountRoutes.me)
        .send({ bio: 'a'.repeat(201) })
        .expect(400);
      expect(Object.keys(long.body.errors)).toEqual(['bio']);
    });

    it('refuses an avatar that is not a completed upload of yours with 40001', async () => {
      const acc = await account();
      const other = await account();
      const theirs = await upload(other.me, await png(), 'image/png');
      const res = await as(acc.me)
        .patch(AccountRoutes.me)
        .send({ avatar_attachment_id: theirs.body.id })
        .expect(400);
      expect(Object.keys(res.body.errors)).toEqual(['avatar_attachment_id']);
    });

    it('saves name and bio, sends USER_UPDATE to the user’s other sessions, and removes the avatar', async () => {
      const acc = await account();
      const gw = await connectGateway(app, acc.tablet);
      const done = await upload(acc.me, await png(), 'image/png');
      const saved = await as(acc.me)
        .patch(AccountRoutes.me)
        .send({
          display_name: '  An Nguyễn  ',
          bio: 'Ôn thi Giải tích 2',
          avatar_attachment_id: done.body.id,
        })
        .expect(200);
      expect(saved.body).toMatchObject({
        display_name: 'An Nguyễn',
        bio: 'Ôn thi Giải tích 2',
      });
      const event = await gw.next(
        'USER_UPDATE',
        (d) => (d as CurrentUser).bio === 'Ôn thi Giải tích 2',
      );
      expect(event.d).toMatchObject({ display_name: 'An Nguyễn' });
      gw.close();

      const cleared = await as(acc.me)
        .patch(AccountRoutes.me)
        .send({ bio: '', avatar_attachment_id: null })
        .expect(200);
      expect(cleared.body).toMatchObject({ bio: null, avatar: null });
      const me = await as(acc.me).get(AccountRoutes.me).expect(200);
      expect(me.body).toMatchObject({ display_name: 'An Nguyễn', bio: null });
    });
  });
});
