import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  AttachmentRoutes,
  DmRoutes,
  ErrorCode,
  MESSAGE_ATTACHMENT_MAX_BYTES,
  MessageRoutes,
  Permission as P,
  ServerRoutes,
  attachmentFilePath,
  type AttachmentResponse,
  type DmChannel,
  type MessageCreateEvent,
  type MessageResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { DB, type Db } from '../src/db/db.module.js';
import { attachments } from '../src/modules/attachments/attachments.schema.js';
import { AttachmentsService } from '../src/modules/attachments/attachments.service.js';
import {
  FriendshipStatus,
  friendships,
} from '../src/modules/friends/friends.schema.js';
import { PermissionCache } from '../src/modules/permissions/permission-cache.js';
import { roles, serverMembers } from '../src/modules/servers/servers.schema.js';
import { users } from '../src/modules/users/users.schema.js';
import type { MemoryObjectStorage } from '../src/modules/storage/object-storage.js';
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

const messagesOf = (channelId: string) =>
  MessageRoutes.list.replace(':id', channelId);
const messagePath = (channelId: string, messageId: string) =>
  MessageRoutes.message
    .replace(':id', channelId)
    .replace(':messageId', messageId);
const completePath = (id: string) =>
  AttachmentRoutes.complete.replace(':id', id);

const solid = (format: 'png' | 'jpeg' | 'webp', w = 1600, h = 1200) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#c85028' } })
    .toFormat(format)
    .toBuffer();

// REQ-MSG-04 (CR-28: images only) P3-A2.1 (#123), CR-28 #29. Storage is in memory.
// Needs `pnpm dev:infra`.
describe('Message attachments (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let storage: MemoryObjectStorage;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer, storage } = await createTestApp());
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
    const token = session.access_token;
    return {
      userId: BigInt(session.user.id),
      id: session.user.id,
      token,
      get: (path: string) => api.get(path).auth(token, auth),
      post: (path: string) => api.post(path).auth(token, auth),
      del: (path: string) => api.delete(path).auth(token, auth),
      patch: (path: string) => api.patch(path).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  const serverOf = async (an: Me, ...members: Me[]) => {
    const server = (
      await an
        .post(ServerRoutes.create)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    if (members.length)
      await db.insert(serverMembers).values(
        members.map((m) => ({
          serverId: BigInt(server.id),
          userId: m.userId,
        })),
      );
    const text = server.channels.find((c) => c.type === 'text')!;
    return { id: server.id, text: text.id };
  };

  const dmOf = async (a: Me, b: Me) => {
    const [low, high] = a.userId < b.userId ? [a, b] : [b, a];
    await db.insert(friendships).values({
      userIdLow: low.userId,
      userIdHigh: high.userId,
      status: FriendshipStatus.accepted,
      requestedBy: a.userId,
    });
    return (
      (await a.post(DmRoutes.create).send({ recipient_id: b.id }).expect(200))
        .body as DmChannel
    ).id;
  };

  const ask = (me: Me, channelId: string, over: Record<string, unknown> = {}) =>
    me.post(AttachmentRoutes.create).send({
      purpose: 'message',
      channel_id: channelId,
      filename: 'loi-giai-1.jpg',
      content_type: 'image/jpeg',
      size_bytes: 1000,
      ...over,
    });

  // POST /attachments → "PUT" → complete: the completed attachment.
  const upload = async (
    me: Me,
    channelId: string,
    body?: Buffer,
    type = 'image/png',
  ) => {
    const bytes = body ?? (await solid('png'));
    const created = await ask(me, channelId, {
      filename: 'cong-thuc.png',
      content_type: type,
      size_bytes: bytes.length,
    }).expect(201);
    storage.upload(created.body.upload_url, bytes, type);
    return (await me.post(completePath(created.body.attachment_id)).expect(200))
      .body as AttachmentResponse;
  };

  const send = (me: Me, channelId: string, body: Record<string, unknown>) =>
    me
      .post(messagesOf(channelId))
      .send({ content: '', nonce: randomUUID(), ...body });

  const keysOf = (id: string) =>
    [...storage.objects.keys()].filter((k) => k.includes(id));

  const denyAttach = async (serverId: string) => {
    const [everyone] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, BigInt(serverId)));
    await db
      .update(roles)
      .set({ permissions: everyone!.permissions & ~P.ATTACH_FILES })
      .where(eq(roles.id, BigInt(serverId)));
    await app.get(PermissionCache).invalidateServer(BigInt(serverId));
  };

  describe('POST /attachments purpose = message', () => {
    it('AC1: 25.1MB → 40013 before any upload URL', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const res = await ask(an, server.text, {
        size_bytes: Math.round(25.1 * 1024 * 1024),
      }).expect(413);
      expect(res.body.code).toBe(ErrorCode.FileTooLarge);
      await ask(an, server.text, {
        size_bytes: MESSAGE_ATTACHMENT_MAX_BYTES,
      }).expect(201);
    });

    it('images only (CR-28): a PDF or HEIC → 40014', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      for (const content_type of ['application/pdf', 'image/heic'])
        expect(
          (await ask(an, server.text, { content_type }).expect(415)).body.code,
        ).toBe(ErrorCode.UnsupportedFileType);
    });

    it('needs ATTACH_FILES (40302) and a channel I can view (40401)', async () => {
      const [an, binh, out] = [
        await signedIn(),
        await signedIn(),
        await signedIn(),
      ];
      const server = await serverOf(an, binh);
      await denyAttach(server.id);
      expect((await ask(binh, server.text).expect(403)).body.code).toBe(
        ErrorCode.Forbidden,
      );
      expect((await ask(out, server.text).expect(404)).body.code).toBe(
        ErrorCode.NotFound,
      );
      // The Owner keeps every permission.
      await ask(an, server.text).expect(201);
    });
  });

  describe('complete (AC2, CR-28 #29)', () => {
    it('AC2: an executable renamed .jpg → 40014 and the file is gone', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const exe = Buffer.concat([
        Buffer.from('MZ\x90\x00\x03\x00\x00\x00'),
        Buffer.alloc(500),
      ]);
      const created = await ask(an, server.text, {
        size_bytes: exe.length,
      }).expect(201);
      storage.upload(created.body.upload_url, exe, 'image/jpeg');
      const res = await an
        .post(completePath(created.body.attachment_id))
        .expect(415);
      expect(res.body.code).toBe(ErrorCode.UnsupportedFileType);
      expect(keysOf(created.body.attachment_id)).toEqual([]);
      const rows = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, BigInt(created.body.attachment_id)));
      expect(rows).toEqual([]);
    });

    it('re-encodes the original upright without EXIF / GPS, and keeps a 720 webp thumbnail', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      // A phone photo: stored sideways with orientation 6 and a GPS-bearing EXIF block.
      const photo = await sharp(await solid('jpeg', 1200, 900))
        .withMetadata({ orientation: 6 })
        .withExif({ IFD0: { Make: 'NezPhone' } })
        .jpeg()
        .toBuffer();
      const done = await upload(an, server.text, photo, 'image/jpeg');
      expect(done).toMatchObject({
        purpose: 'message',
        content_type: 'image/jpeg',
        width: 900,
        height: 1200,
      });
      const [row] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, BigInt(done.id)));
      const original = storage.objects.get(row!.storageKey)!.body;
      const meta = await sharp(original).metadata();
      expect(meta).toMatchObject({ format: 'jpeg', width: 900, height: 1200 });
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      const thumb = await sharp(
        storage.objects.get(row!.thumbnailKey!)!.body,
      ).metadata();
      expect(thumb).toMatchObject({ format: 'webp', width: 540, height: 720 });
    });

    it('a GIF keeps its frames', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const frames = await Promise.all(
        ['#ff0000', '#00ff00'].map((background) =>
          sharp({
            create: { width: 40, height: 30, channels: 3, background },
          })
            .raw()
            .toBuffer(),
        ),
      );
      const gif = await sharp(Buffer.concat(frames), {
        raw: { width: 40, height: 60, channels: 3, pageHeight: 30 },
      } as never)
        .gif({ delay: [100, 100] })
        .toBuffer();
      const done = await upload(an, server.text, gif, 'image/gif');
      expect(done).toMatchObject({
        content_type: 'image/gif',
        width: 40,
        height: 30,
      });
      const [row] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, BigInt(done.id)));
      const meta = await sharp(storage.objects.get(row!.storageKey)!.body, {
        animated: true,
      }).metadata();
      expect(meta.pages).toBe(2);
    });
  });

  describe('sending (AC4, AC5)', () => {
    it('images with no text → 201 with the attachments, in history and on MESSAGE_CREATE', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const one = await upload(binh, server.text);
      const two = await upload(binh, server.text);
      const gateway = await connectGateway(app, an.token);
      const sent = (
        await send(binh, server.text, {
          content: 'Ảnh chụp lời giải câu 1–3 nè',
          attachment_ids: [one.id, two.id],
        }).expect(201)
      ).body as MessageResponse;
      expect(sent.attachments.map((a) => a.id)).toEqual([one.id, two.id]);
      expect(sent.attachments[0]).toEqual({
        id: one.id,
        filename: 'cong-thuc.png',
        content_type: 'image/png',
        size_bytes: expect.any(Number),
        width: 1600,
        height: 1200,
        url: attachmentFilePath(one.id, 'original'),
        thumbnail_url: attachmentFilePath(one.id, 'thumbnail'),
      });
      const event = await gateway.next(
        'MESSAGE_CREATE',
        (d) => (d as MessageCreateEvent).id === sent.id,
      );
      expect((event.d as MessageCreateEvent).attachments).toHaveLength(2);
      gateway.close();
      const history = (await an.get(messagesOf(server.text)).expect(200))
        .body as MessageResponse[];
      expect(history.at(-1)!.attachments).toHaveLength(2);
      const imageOnly = (
        await send(binh, server.text, {
          attachment_ids: [(await upload(binh, server.text)).id],
        }).expect(201)
      ).body as MessageResponse;
      expect(imageOnly.content).toBe('');
    });

    it('AC4: sent again with the same nonce after a drop → the same message, once', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const image = await upload(an, server.text);
      const body = { nonce: randomUUID(), attachment_ids: [image.id] };
      const first = (await send(an, server.text, body).expect(201))
        .body as MessageResponse;
      const again = (await send(an, server.text, body).expect(201))
        .body as MessageResponse;
      expect(again.id).toBe(first.id);
      expect(again.attachments.map((a) => a.id)).toEqual([image.id]);
      const history = (await an.get(messagesOf(server.text)).expect(200))
        .body as MessageResponse[];
      expect(history.filter((m) => m.id === first.id)).toHaveLength(1);
    });

    it('AC5: not completed, not mine, another channel or already sent → 40001', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const other = await serverOf(an);
      const pending = (await ask(an, server.text).expect(201)).body
        .attachment_id as string;
      const binhs = await upload(binh, server.text);
      const elsewhere = await upload(an, other.text);
      const used = await upload(an, server.text);
      await send(an, server.text, { attachment_ids: [used.id] }).expect(201);
      for (const id of [pending, binhs.id, elsewhere.id, used.id]) {
        const res = await send(an, server.text, {
          content: 'kèm ảnh',
          attachment_ids: [id],
        }).expect(400);
        expect(res.body.code).toBe(ErrorCode.ValidationError);
        expect(res.body.errors).toHaveProperty('attachment_ids');
      }
    });

    it('without ATTACH_FILES a message with images → 40302', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const server = await serverOf(an, binh);
      const image = await upload(binh, server.text);
      await denyAttach(server.id);
      const res = await send(binh, server.text, {
        attachment_ids: [image.id],
      }).expect(403);
      expect(res.body.code).toBe(ErrorCode.Forbidden);
    });

    it('in a DM either person sends images (no server permissions), and the DM list shows them', async () => {
      const [an, binh] = [await signedIn(), await signedIn()];
      const dm = await dmOf(an, binh);
      const image = await upload(an, dm);
      await send(an, dm, { attachment_ids: [image.id] }).expect(201);
      // S-DM-01 "Đã gửi một ảnh" reads the last message's images.
      const seen = (
        await binh
          .post(DmRoutes.create)
          .send({ recipient_id: an.id })
          .expect(200)
      ).body as DmChannel;
      expect(seen.id).toBe(dm);
      expect(seen.last_message!.attachments).toHaveLength(1);
    });
  });

  describe('GET /attachments/:id/:variant (CR-28 #29)', () => {
    it('who can view the message → 302 to a signed URL; others and deleted messages → 40401', async () => {
      const [an, binh, out] = [
        await signedIn(),
        await signedIn(),
        await signedIn(),
      ];
      const server = await serverOf(an, binh);
      const image = await upload(binh, server.text);
      const sent = (
        await send(binh, server.text, { attachment_ids: [image.id] }).expect(
          201,
        )
      ).body as MessageResponse;
      const [row] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, BigInt(image.id)));
      const original = await an
        .get(attachmentFilePath(image.id, 'original'))
        .expect(302);
      expect(original.headers.location).toBe(`memory://${row!.storageKey}`);
      const thumb = await an
        .get(attachmentFilePath(image.id, 'thumbnail'))
        .expect(302);
      expect(thumb.headers.location).toBe(`memory://${row!.thumbnailKey}`);
      await out.get(attachmentFilePath(image.id, 'original')).expect(404);
      await an.get(`/attachments/${image.id}/large`).expect(404);
      await binh.del(messagePath(server.text, sent.id)).expect(204);
      await an.get(attachmentFilePath(image.id, 'original')).expect(404);
    });

    it('an image not sent yet is nobody’s to read', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const image = await upload(an, server.text);
      await an.get(attachmentFilePath(image.id, 'original')).expect(404);
    });
  });

  describe('24h sweep (SRS 8.2 attachments, replaced avatars)', () => {
    const backdate = (id: string, hours: number) =>
      db
        .update(attachments)
        .set({ createdAt: new Date(Date.now() - hours * 3600_000) })
        .where(eq(attachments.id, BigInt(id)));

    it('drops unsent images and replaced avatars older than 24h, keeps the rest', async () => {
      const an = await signedIn();
      const server = await serverOf(an);
      const unsent = await upload(an, server.text);
      const fresh = await upload(an, server.text);
      const sentOne = await upload(an, server.text);
      await send(an, server.text, { attachment_ids: [sentOne.id] }).expect(201);
      const pending = (await ask(an, server.text).expect(201)).body
        .attachment_id as string;
      const avatar = async () => {
        const bytes = await solid('png', 300, 300);
        const created = await an
          .post(AttachmentRoutes.create)
          .send({
            purpose: 'avatar',
            filename: 'a.png',
            content_type: 'image/png',
            size_bytes: bytes.length,
          })
          .expect(201);
        storage.upload(created.body.upload_url, bytes, 'image/png');
        await an.post(completePath(created.body.attachment_id)).expect(200);
        await an
          .patch('/users/@me')
          .send({ avatar_attachment_id: created.body.attachment_id })
          .expect(200);
        return created.body.attachment_id as string;
      };
      const oldAvatar = await avatar();
      const currentAvatar = await avatar();
      for (const id of [
        unsent.id,
        sentOne.id,
        pending,
        oldAvatar,
        currentAvatar,
      ])
        await backdate(id, 25);

      await app.get(AttachmentsService).sweep();

      const left = new Set(
        (await db.select({ id: attachments.id }).from(attachments)).map((r) =>
          r.id.toString(),
        ),
      );
      expect(left.has(unsent.id)).toBe(false);
      expect(left.has(pending)).toBe(false);
      expect(left.has(oldAvatar)).toBe(false);
      expect(left.has(fresh.id)).toBe(true);
      expect(left.has(sentOne.id)).toBe(true);
      expect(left.has(currentAvatar)).toBe(true);
      expect(keysOf(unsent.id)).toEqual([]);
      expect(keysOf(oldAvatar)).toEqual([]);
      expect(keysOf(currentAvatar)).not.toEqual([]);
      const [me] = await db.select().from(users).where(eq(users.id, an.userId));
      expect(me!.avatarKey).toContain(currentAvatar);
    });
  });
});
