import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  CANNOT_MESSAGE_TEXT,
  ChannelRoutes,
  ErrorCode,
  MessageRoutes,
  TypingRoutes,
  type DmChannel,
} from '@nezfocus/shared';
import { eq } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { DmAccessPolicy } from '../src/modules/channels/dm-access-policy.js';
import {
  channelRecipients,
  dmPairs,
} from '../src/modules/channels/dm.schema.js';
import {
  ChannelTypeCode,
  channels,
} from '../src/modules/servers/servers.schema.js';
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
const channel = (id: string) => ChannelRoutes.byId.replace(':id', id);

// REQ-DM-01..03 through REST, Postgres and the Gateway. Needs `pnpm dev:infra`.
describe('DM (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;
  let ids: SnowflakeGenerator;

  const start = async (canSend?: boolean) => {
    ({ app, mailer } = await createTestApp((b) =>
      canSend === undefined
        ? b
        : b.overrideProvider(DmAccessPolicy).useValue({
            canView: async () => true,
            canSend: async () => canSend,
          }),
    ));
    await app.listen(0);
    db = app.get(DB);
    ids = app.get(SnowflakeGenerator);
  };

  const signedIn = async (name = 'An') => {
    const session = await signInWithCode(app, mailer, uniqueEmail());
    const token = session.access_token;
    await http(app)
      .post('/auth/complete-account')
      .auth(token, { type: 'bearer' })
      .send({ ...completion(uniqueUsername()), display_name: name })
      .expect(200);
    const auth = { type: 'bearer' as const };
    return {
      id: session.user.id,
      userId: BigInt(session.user.id),
      token,
      get: (p: string) => http(app).get(p).auth(token, auth),
      post: (p: string) => http(app).post(p).auth(token, auth),
      delete: (p: string) => http(app).delete(p).auth(token, auth),
    };
  };
  type Me = Awaited<ReturnType<typeof signedIn>>;

  // What POST /users/@me/channels (P2-B3.2 #115) writes.
  const dmRows = async (a: Me, b: Me) => {
    const id = ids.next();
    const [low, high] = a.userId < b.userId ? [a, b] : [b, a];
    await db.insert(channels).values({ id, type: ChannelTypeCode.dm });
    await db.insert(channelRecipients).values([
      { channelId: id, userId: a.userId },
      { channelId: id, userId: b.userId },
    ]);
    await db.insert(dmPairs).values({
      userIdLow: low.userId,
      userIdHigh: high.userId,
      channelId: id,
    });
    return id.toString();
  };

  const send = (me: Me, channelId: string, content = 'Ok 👍') =>
    me.post(messagesOf(channelId)).send({ content, nonce: randomUUID() });

  describe('with the DM policy (P2-B3.1 #114)', () => {
    beforeAll(() => start());
    afterAll(() => app.close());

    it('REQ-DM-01: a person of the DM sends and reads without server RBAC', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmRows(an, binh);
      await send(an, dm).expect(201);
      const history = await binh.get(messagesOf(dm)).expect(200);
      expect(history.body.map((m: { content: string }) => m.content)).toEqual([
        'Ok 👍',
      ]);
    });

    it('someone outside the DM gets 40401, as for a channel they cannot view', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const chi = await signedIn('Chi');
      const dm = await dmRows(an, binh);
      const res = await send(chi, dm).expect(404);
      expect(res.body.code).toBe(ErrorCode.NotFound);
      await chi.get(messagesOf(dm)).expect(404);
    });

    it('CR-12 #3: a DM keeps a mention of its people only, nothing of roles or @everyone', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const chi = await signedIn('Chi');
      const dm = await dmRows(an, binh);
      const res = await send(
        an,
        dm,
        `<@${binh.id}> <@${chi.id}> @everyone`,
      ).expect(201);
      expect(res.body.mention_user_ids).toEqual([binh.id]);
      expect(res.body.mention_everyone).toBe(false);
    });

    it('typing in a DM reaches the other person only', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmRows(an, binh);
      const gw = await connectGateway(app, binh.token);
      await an.post(TypingRoutes.start.replace(':id', dm)).expect(204);
      const typing = await gw.next('TYPING_START');
      expect(typing.d).toMatchObject({ channel_id: dm, server_id: null });
      gw.close();
    });

    it('CR-28: DELETE closes the DM on my side only; READY lists what is open', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmRows(an, binh);
      const before = await connectGateway(app, an.token);
      const ready = before.ready() as { private_channels: DmChannel[] };
      expect(ready.private_channels).toEqual([
        {
          id: dm,
          type: 'dm',
          recipient: expect.objectContaining({
            id: binh.id,
            display_name: 'Bình',
            deleted: false,
          }),
          last_message_id: null,
        },
      ]);
      before.close();

      await an.delete(channel(dm)).expect(204);
      const rows = await db
        .select()
        .from(channelRecipients)
        .where(eq(channelRecipients.channelId, BigInt(dm)));
      expect(
        Object.fromEntries(rows.map((r) => [String(r.userId), r.closed])),
      ).toEqual({ [an.id]: true, [binh.id]: false });
      const live = await db
        .select()
        .from(channels)
        .where(eq(channels.id, BigInt(dm)));
      expect(live[0]?.deletedAt).toBeNull();
      // Messages are kept.
      await an.get(messagesOf(dm)).expect(200);
    });

    it('DELETE on a DM I am not in is 40401', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const chi = await signedIn('Chi');
      const dm = await dmRows(an, binh);
      await chi.delete(channel(dm)).expect(404);
    });
  });

  describe('when the policy refuses', () => {
    beforeAll(() => start(false));
    afterAll(() => app.close());

    it('FRIEND-03 AC1 / DM-02: sending and typing get 40303 with the one sentence', async () => {
      const an = await signedIn();
      const binh = await signedIn('Bình');
      const dm = await dmRows(an, binh);
      const res = await send(an, dm).expect(403);
      expect(res.body).toMatchObject({
        code: ErrorCode.CannotMessageUser,
        message: CANNOT_MESSAGE_TEXT,
      });
      await an.post(TypingRoutes.start.replace(':id', dm)).expect(403);
    });
  });
});
