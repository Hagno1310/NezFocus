import type { INestApplication } from '@nestjs/common';
import {
  ChannelRoutes,
  ErrorCode,
  GatewayOp,
  Permission as P,
  ServerRoutes,
  TypingRoutes,
  type ServerResponse,
  type TypingStart,
} from '@nezfocus/shared';
import { DB, type Db } from '../src/db/db.module.js';
import { serverMembers } from '../src/modules/servers/servers.schema.js';
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

const typingIn = (channelId: string) =>
  TypingRoutes.start.replace(':id', channelId);
const settle = () => new Promise((r) => setTimeout(r, 300));

// REQ-MSG-06 backend: POST /channels/{id}/typing → TYPING_START to subscribers. Needs `pnpm dev:infra`.
describe('Typing (e2e)', () => {
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

  const signedIn = async (name: string) => {
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
      post: (p: string) => http(app).post(p).auth(token, auth),
      put: (p: string) => http(app).put(p).auth(token, auth),
      patch: (p: string) => http(app).patch(p).auth(token, auth),
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
    await db
      .insert(serverMembers)
      .values(
        members.map((m) => ({ serverId: BigInt(server.id), userId: m.userId })),
      );
    const text = server.channels.find((c) => c.type === 'text')!;
    await an
      .patch(ChannelRoutes.byId.replace(':id', text.id))
      .send({ permissions_synced: false })
      .expect(200);
    const deny = (targetId: string, type: 'member' | 'role', bit: bigint) =>
      an
        .put(
          ChannelRoutes.permission
            .replace(':id', text.id)
            .replace(':targetId', targetId),
        )
        .send({ target_type: type, allow: '0', deny: bit.toString() })
        .expect(200);
    return { id: server.id, channelId: text.id, deny };
  };

  const subscribed = async (me: Me, serverId: string | null) => {
    const gateway = await connectGateway(app, me.token);
    if (serverId) gateway.send(GatewayOp.SUBSCRIBE, { server_id: serverId });
    return gateway;
  };
  const typings = (g: Awaited<ReturnType<typeof connectGateway>>) =>
    g.dispatches.filter((x) => x.t === 'TYPING_START');

  it('AC1: TYPING_START reaches subscribers who can view the channel, not the typer, within 500 ms', async () => {
    const [chi, binh, dung, khanh, minh] = await Promise.all(
      ['Chi', 'Bình', 'Dũng', 'Khánh', 'Minh'].map(signedIn),
    );
    const server = await serverOf(chi, binh, dung, khanh, minh);
    await server.deny(dung.id, 'member', P.VIEW_CHANNEL);
    const [gChi, gBinh, gDung, gKhanh, gMinh] = await Promise.all([
      subscribed(chi, server.id),
      subscribed(binh, server.id),
      subscribed(dung, server.id),
      subscribed(khanh, null), // online, server not open
      subscribed(minh, '1'), // another server open
    ]);
    await settle(); // SUBSCRIBE frames are in

    const sentAt = Date.now();
    await chi.post(typingIn(server.channelId)).expect(204);
    const event = await gBinh.next('TYPING_START');
    expect(event.at - sentAt).toBeLessThan(500);
    expect(event.d as TypingStart).toMatchObject({
      channel_id: server.channelId,
      server_id: server.id,
      user: { id: chi.id, display_name: 'Chi' },
    });
    await settle();
    for (const g of [gChi, gDung, gKhanh, gMinh])
      expect(typings(g)).toHaveLength(0);

    // DEC-33: a repeat within 8 s is accepted but not broadcast again.
    await chi.post(typingIn(server.channelId)).expect(204);
    await settle();
    expect(typings(gBinh)).toHaveLength(1);

    for (const g of [gChi, gBinh, gDung, gKhanh, gMinh]) g.close();
  });

  it('without SEND_MESSAGES → 40302; cannot view → 40401; nothing is broadcast', async () => {
    const [an, binh, dung] = await Promise.all(
      ['An', 'Bình', 'Dũng'].map(signedIn),
    );
    const server = await serverOf(an, binh, dung);
    await server.deny(server.id, 'role', P.SEND_MESSAGES);
    await server.deny(dung.id, 'member', P.VIEW_CHANNEL);
    const gAn = await subscribed(an, server.id);
    await settle();

    const muted = await binh.post(typingIn(server.channelId));
    expect(muted.status).toBe(403);
    expect(muted.body.code).toBe(ErrorCode.Forbidden);
    const blind = await dung.post(typingIn(server.channelId));
    expect(blind.status).toBe(404);
    expect(blind.body.code).toBe(ErrorCode.NotFound);

    await settle();
    expect(typings(gAn)).toHaveLength(0);
    gAn.close();
  });
});
