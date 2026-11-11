import type { INestApplication } from '@nestjs/common';
import {
  AttachmentRoutes,
  ErrorCode,
  ServerRoutes,
  type ServerResponse,
} from '@nezfocus/shared';
import sharp from 'sharp';
import { EventPublisher } from '../src/modules/gateway/event-publisher.js';
import { DB, type Db } from '../src/db/db.module.js';
import { serverMembers } from '../src/modules/servers/servers.schema.js';
import type { MemoryObjectStorage } from '../src/modules/storage/object-storage.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const byId = (id: string) => ServerRoutes.byId.replace(':id', id);
const completePath = (id: string) =>
  AttachmentRoutes.complete.replace(':id', id);

// REQ-SRV-01 server icon (P1-A4.7 #211): POST /attachments `server_icon` → create / PATCH
// the server. Needs `pnpm dev:infra`; storage is in memory.
describe('Server icon (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let storage: MemoryObjectStorage;
  let db: Db;
  const events: { t: string; d: unknown }[] = [];

  beforeAll(async () => {
    ({ app, mailer, storage } = await createTestApp((b) =>
      b.overrideProvider(EventPublisher).useValue({
        toUser: async () => {},
        toServer: async (_: bigint, t: string, d: unknown) =>
          void events.push({ t, d }),
        toChannel: async () => {},
      }),
    ));
    await app.listen(0);
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const signedIn = async () => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    await http(app)
      .post('/auth/complete-account')
      .auth(session.access_token, { type: 'bearer' })
      .send(completion(uniqueUsername()))
      .expect(200);
    const auth = { type: 'bearer' as const };
    const api = http(app);
    return {
      userId: BigInt(session.user.id),
      post: (path: string) => api.post(path).auth(session.access_token, auth),
      patch: (path: string) => api.patch(path).auth(session.access_token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const png = () =>
    sharp({
      create: { width: 300, height: 300, channels: 3, background: '#547fe4' },
    })
      .png()
      .toBuffer();

  // POST /attachments → "PUT" → complete; returns the attachment id.
  const uploadIcon = async (me: Me, purpose = 'server_icon') => {
    const body = await png();
    const created = await me
      .post(AttachmentRoutes.create)
      .send({
        purpose,
        filename: 'icon.png',
        content_type: 'image/png',
        size_bytes: body.length,
      })
      .expect(201);
    storage.upload(created.body.upload_url, body, 'image/png');
    await me.post(completePath(created.body.attachment_id)).expect(200);
    return created.body.attachment_id as string;
  };

  const fetchIcon = (url: string) =>
    http(app)
      .get(url)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

  it('a server created with an icon has it at once; without one it still works', async () => {
    const me = await signedIn();
    const icon = await uploadIcon(me);
    const res = await me
      .post(ServerRoutes.create)
      .send({
        name: 'Ôn thi Giải tích 2',
        template: 'general',
        icon_attachment_id: icon,
      })
      .expect(201);
    const server = res.body as ServerResponse;
    expect(server.icon_url).toMatch(/^\/media\/server-icons\/\d+\/256\.webp$/);
    const file = await fetchIcon(server.icon_url!)
      .expect(200)
      .expect('Content-Type', 'image/webp');
    expect(await sharp(file.body as Buffer).metadata()).toMatchObject({
      format: 'webp',
      width: 256,
    });

    const plain = await me
      .post(ServerRoutes.create)
      .send({ name: 'Nhóm đồ án Mobile', template: 'general' })
      .expect(201);
    expect(plain.body.icon_url).toBeNull();
  });

  it('PATCH sets and removes the icon; SERVER_UPDATE carries it', async () => {
    const me = await signedIn();
    const server = (
      await me
        .post(ServerRoutes.create)
        .send({ name: 'CLB Guitar PTIT', template: 'general' })
        .expect(201)
    ).body as ServerResponse;

    const icon = await uploadIcon(me);
    events.length = 0;
    const set = await me
      .patch(byId(server.id))
      .send({ icon_attachment_id: icon })
      .expect(200);
    expect(set.body.icon_url).toContain(`/server-icons/${icon}/`);
    expect(events).toEqual([
      {
        t: 'SERVER_UPDATE',
        d: expect.objectContaining({ icon_url: set.body.icon_url }),
      },
    ]);

    const cleared = await me
      .patch(byId(server.id))
      .send({ icon_attachment_id: null })
      .expect(200);
    expect(cleared.body.icon_url).toBeNull();
  });

  it('only MANAGE_SERVER may change it (40302)', async () => {
    const owner = await signedIn();
    const member = await signedIn();
    const server = (
      await owner
        .post(ServerRoutes.create)
        .send({ name: 'CLB Guitar PTIT', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    await db
      .insert(serverMembers)
      .values({ serverId: BigInt(server.id), userId: member.userId });

    const icon = await uploadIcon(member);
    const res = await member
      .patch(byId(server.id))
      .send({ icon_attachment_id: icon })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.Forbidden);
  });

  it('an avatar, or someone else’s icon, is not a server icon (40001)', async () => {
    const me = await signedIn();
    const other = await signedIn();
    const avatar = await uploadIcon(me, 'avatar');
    const theirs = await uploadIcon(other);
    for (const id of [avatar, theirs]) {
      const res = await me
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi', template: 'general', icon_attachment_id: id })
        .expect(400);
      expect(res.body.errors).toHaveProperty('icon_attachment_id');
    }
  });

  it('server_icon takes the avatar rules: a GIF is 40014 up front', async () => {
    const me = await signedIn();
    const res = await me
      .post(AttachmentRoutes.create)
      .send({
        purpose: 'server_icon',
        filename: 'icon.gif',
        content_type: 'image/gif',
        size_bytes: 1000,
      })
      .expect(415);
    expect(res.body.code).toBe(ErrorCode.UnsupportedFileType);
  });
});
