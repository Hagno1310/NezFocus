import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { GatewayRoutes, type ServerFrame } from '@nezfocus/shared';
import WebSocket from 'ws';
import {
  CapturingMailer,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
} from './helpers.js';

// P0-5.2 through a real socket, Postgres and Redis. Needs `pnpm dev:infra`.
describe('Gateway (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let base: string;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    base = `ws://127.0.0.1:${port}${GatewayRoutes.connect}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const open = (query = '?v=1&encoding=json') => {
    const ws = new WebSocket(base + query);
    const frames: ServerFrame[] = [];
    const waiters: (() => void)[] = [];
    ws.on('message', (data) => {
      frames.push(JSON.parse(data.toString()));
      waiters.splice(0).forEach((w) => w());
    });
    const closed = new Promise<{ code: number; reason: string }>((resolve) =>
      ws.on('close', (code, reason) =>
        resolve({ code, reason: reason.toString() }),
      ),
    );
    const next = async (match: (f: ServerFrame) => boolean) => {
      for (;;) {
        const found = frames.find(match);
        if (found) return found;
        await new Promise<void>((r) => waiters.push(r));
      }
    };
    return { ws, next, closed };
  };

  it('HELLO → IDENTIFY → READY, then 4004 + reason when the login is revoked (AUTH-04 AC2)', async () => {
    const dev = device();
    const session = await signInWithCode(app, mailer, uniqueEmail(), dev);
    const { ws, next, closed } = open();

    const hello = await next((f) => f.op === 10);
    expect(hello).toEqual({ op: 10, d: { heartbeat_interval: 41250 } });

    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: session.access_token,
          device: {
            platform: 'android',
            app_version: '0.1.0',
            device_id: dev.id,
          },
        },
      }),
    );
    const ready = await next((f) => f.op === 0 && f.t === 'READY');
    expect(ready).toMatchObject({
      s: 1,
      d: {
        session_id: expect.stringMatching(/^\d+$/),
        user: { id: session.user.id },
      },
    });

    const refresh = (token: string) =>
      http(app).post('/auth/refresh').send({ refresh_token: token });
    await refresh(session.refresh_token).expect(200);
    await refresh(session.refresh_token).expect(401);

    expect(await closed).toEqual({ code: 4004, reason: 'reuse_detected' });
  });

  it('closes 4010 for an unsupported protocol version', async () => {
    const { closed } = open('?v=0');
    expect((await closed).code).toBe(4010);
  });
});
