import type { INestApplication } from '@nestjs/common';
import {
  AttachmentRoutes,
  ServerRoutes,
  attachmentFilePath,
  type AttachmentUploadResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import sharp from 'sharp';
import {
  ObjectStorage,
  S3ObjectStorage,
} from '../src/modules/storage/object-storage.js';
import {
  CapturingMailer,
  completion,
  createTestApp,
  http,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from './helpers.js';

const S3 = process.env.S3_ENDPOINT ?? 'http://localhost:8333';
// CI has no S3 (helpers.createTestApp): this file runs where `pnpm dev:infra` is up.
const s3Up = await fetch(S3).then(
  () => true,
  () => false,
);

// REQ-MSG-04 against the real SeaweedFS of `pnpm dev:infra`: the presigned PUT only takes the
// declared length (AC1), and the signed read URL serves the stored image (CR-28 #29).
describe.skipIf(!s3Up)('Message attachments on SeaweedFS (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp((b) =>
      b.overrideProvider(ObjectStorage).useClass(S3ObjectStorage),
    ));
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('PUT with another length is refused; the real bytes go through and read back', async () => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const token = session.access_token;
    const api = http(app);
    const auth = { type: 'bearer' as const };
    await api
      .post('/auth/complete-account')
      .auth(token, auth)
      .send(completion(uniqueUsername()))
      .expect(200);
    const server = (
      await api
        .post(ServerRoutes.create)
        .auth(token, auth)
        .send({ name: 'Ôn thi Giải tích 2', template: 'general' })
        .expect(201)
    ).body as ServerResponse;
    const channel = server.channels.find((c) => c.type === 'text')!.id;
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#547fe4' },
    })
      .png()
      .toBuffer();

    const created = (
      await api
        .post(AttachmentRoutes.create)
        .auth(token, auth)
        .send({
          purpose: 'message',
          channel_id: channel,
          filename: 'loi-giai-1.png',
          content_type: 'image/png',
          size_bytes: png.length,
        })
        .expect(201)
    ).body as AttachmentUploadResponse;

    const put = (body: Buffer) =>
      fetch(created.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: new Uint8Array(body),
      });
    expect((await put(Buffer.concat([png, Buffer.alloc(1024)]))).ok).toBe(
      false,
    );
    expect((await put(png)).ok).toBe(true);
    await api
      .post(AttachmentRoutes.complete.replace(':id', created.attachment_id))
      .auth(token, auth)
      .expect(200);
    await api
      .post(`/channels/${channel}/messages`)
      .auth(token, auth)
      .send({
        content: '',
        nonce: `s3-${created.attachment_id}`,
        attachment_ids: [created.attachment_id],
      })
      .expect(201);

    const read = await api
      .get(attachmentFilePath(created.attachment_id, 'thumbnail'))
      .auth(token, auth)
      .expect(302);
    const image = await fetch(read.headers.location!);
    expect(image.ok).toBe(true);
    const meta = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 720, height: 540 });
  });
});
