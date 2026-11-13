import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../src/db/db.module.js';
import { NotificationService } from '../src/modules/notifications/notification-service.js';
import { notifications } from '../src/modules/notifications/notifications.schema.js';
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

// P2-B4 (#118): NotificationService through Postgres and the Gateway (REQ-NOTIF-05, SRS 5.4,
// 8.2). Needs `pnpm dev:infra`.
describe('NotificationService (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let service: NotificationService;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    db = app.get(DB);
    service = app.get(NotificationService);
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
  const itemsOf = (userId: bigint) =>
    db.select().from(notifications).where(eq(notifications.userId, userId));
  let n = 1000n;
  const message = (actor: string) => ({
    actor_id: actor,
    server_id: '1',
    channel_id: '2',
    message_id: String(n++),
  });

  it('create stores type + data and reaches every session of the recipient', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const phone = await connectGateway(app, an.token);
    const tablet = await connectGateway(app, an.token);
    const data = message(binh.id);

    const id = await service.create(an.userId, 'reply', data);

    expect(await itemsOf(an.userId)).toEqual([
      expect.objectContaining({ id, type: 'reply', data, readAt: null }),
    ]);
    for (const session of [phone, tablet]) {
      const { d } = await session.next('NOTIFICATION_CREATE');
      expect(d).toMatchObject({
        id: String(id),
        type: 'reply',
        data,
        read: false,
      });
      session.close();
    }
  });

  it('a second create for the same (user, message_id) keeps one item', async () => {
    const [an, binh] = [await signedIn(), await signedIn()];
    const data = message(binh.id);
    expect(
      await service.create(an.userId, 'mention', { ...data, via: 'user' }),
    ).not.toBeNull();
    expect(await service.create(an.userId, 'reply', data)).toBeNull();
    expect(await itemsOf(an.userId)).toHaveLength(1);
  });

  it('deleteBySource removes the items and sends NOTIFICATION_DELETE {ids}', async () => {
    const [an, binh, chi] = [
      await signedIn(),
      await signedIn(),
      await signedIn(),
    ];
    const phone = await connectGateway(app, an.token);
    const data = message(chi.id);
    const forAn = await service.create(an.userId, 'mention', {
      ...data,
      via: 'everyone',
    });
    await service.create(binh.userId, 'mention', { ...data, via: 'everyone' });

    await service.deleteBySource({ message_id: BigInt(data.message_id) });

    expect(await itemsOf(an.userId)).toEqual([]);
    expect(await itemsOf(binh.userId)).toEqual([]);
    const { d } = await phone.next('NOTIFICATION_DELETE');
    expect(d).toEqual({ ids: [String(forAn)] });
    phone.close();
  });

  it('a declined / cancelled friend request removes only that request item', async () => {
    const [an, binh, chi] = [
      await signedIn(),
      await signedIn(),
      await signedIn(),
    ];
    await service.create(an.userId, 'friend_request', { actor_id: binh.id });
    await service.create(an.userId, 'friend_request', { actor_id: chi.id });

    await service.deleteBySource({
      friend_request: { from_user_id: binh.userId, to_user_id: an.userId },
    });

    expect(await itemsOf(an.userId)).toEqual([
      expect.objectContaining({ data: { actor_id: chi.id } }),
    ]);
  });
});
