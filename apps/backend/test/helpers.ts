import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import {
  GatewayRoutes,
  TERMS_VERSION,
  type ServerFrame,
} from '@nezfocus/shared';
import request from 'supertest';
import WebSocket from 'ws';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { AuthMailer } from '../src/modules/auth/auth-mailer.js';
import { KeyValueStore } from '../src/redis/key-value-store.js';

// Stands for "any other app API": no @AllowIncomplete, so incomplete accounts get 40309.
@Controller('e2e-probe')
class ProbeController {
  @Get()
  ok() {
    return { ok: true };
  }
}

export class CapturingMailer extends AuthMailer {
  readonly codes = new Map<string, string>();
  readonly alerts: string[] = [];

  async sendSignInCode(email: string, code: string) {
    this.codes.set(email, code);
  }

  async sendNewDeviceAlert(email: string) {
    this.alerts.push(email);
  }
}

// `override` swaps more providers, e.g. a fixed Clock.
export async function createTestApp(
  override: (b: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
) {
  const mailer = new CapturingMailer();
  const moduleRef = await override(
    Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    })
      .overrideProvider(AuthMailer)
      .useValue(mailer),
  ).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, mailer };
}

export const uniqueEmail = (name = 'an') =>
  `${name}.${randomUUID().slice(0, 8)}@nezfocus.test`;

export const device = (id = randomUUID()) => ({ id, name: 'Pixel 7' });

// Rate limits are per email, so every test uses fresh addresses and devices.
export const http = (app: INestApplication) => {
  const server = app.getHttpServer();
  return {
    post: (path: string) =>
      request(server)
        .post(`/api/v1${path}`)
        .set('X-Client-Platform', 'android'),
    get: (path: string) =>
      request(server).get(`/api/v1${path}`).set('X-Client-Platform', 'android'),
    patch: (path: string) =>
      request(server)
        .patch(`/api/v1${path}`)
        .set('X-Client-Platform', 'android'),
    put: (path: string) =>
      request(server).put(`/api/v1${path}`).set('X-Client-Platform', 'android'),
    delete: (path: string) =>
      request(server)
        .delete(`/api/v1${path}`)
        .set('X-Client-Platform', 'android'),
  };
};

export const completion = (username: string) => ({
  display_name: 'An Nguyễn',
  username,
  password: 'Ontap2026!',
  timezone: 'Asia/Ho_Chi_Minh',
  locale: 'vi',
  age_confirmed: true,
  terms_accepted: true,
  terms_version: TERMS_VERSION,
});

export const uniqueUsername = () => `an_${randomUUID().slice(0, 8)}`;

// Email → code → signed in (new or existing account).
export async function signInWithCode(
  app: INestApplication,
  mailer: CapturingMailer,
  email: string,
  dev = device(),
) {
  const api = http(app);
  await api.post('/auth/email-code').send({ email, device: dev }).expect(200);
  const res = await api
    .post('/auth/email-code/verify')
    .send({ email, code: mailer.codes.get(email), device: dev })
    .expect(200);
  return res.body as {
    access_token: string;
    refresh_token: string;
    session_id: string;
    user: { id: string; account_completed: boolean };
    suggested_username: string | null;
  };
}

// Lets a test send again to the same email without waiting out the 1-minute resend limit.
export const resetResendLimit = (app: INestApplication, email: string) =>
  app.get(KeyValueStore).delete(`email-code:minute:${email}`);

// A signed-in Gateway session that keeps every DISPATCH it gets. The app must be listening.
export async function connectGateway(app: INestApplication, token: string) {
  const { port } = app.getHttpServer().address() as AddressInfo;
  const ws = new WebSocket(
    `ws://127.0.0.1:${port}${GatewayRoutes.connect}?v=1&encoding=json`,
  );
  const dispatches: { t: string; d: unknown; at: number }[] = [];
  const waiters: (() => void)[] = [];
  await new Promise<void>((ready) => {
    ws.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as ServerFrame;
      if (frame.op === 10)
        ws.send(
          JSON.stringify({
            op: 2,
            d: {
              token,
              device: {
                platform: 'android',
                app_version: '0.1.0',
                device_id: 'd2',
              },
            },
          }),
        );
      if (frame.op !== 0) return;
      if (frame.t === 'READY') return ready();
      dispatches.push({ t: frame.t, d: frame.d, at: Date.now() });
      waiters.splice(0).forEach((w) => w());
    });
  });
  // The first `t` (matching `where`) already got or still to come, within 3 seconds.
  const next = (t: string, where: (d: unknown) => boolean = () => true) =>
    new Promise<{ d: unknown; at: number }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no ${t}`)), 3000);
      const look = () => {
        const hit = dispatches.find((x) => x.t === t && where(x.d));
        if (!hit) return void waiters.push(look);
        clearTimeout(timer);
        resolve(hit);
      };
      look();
    });
  const send = (op: number, d: unknown) => ws.send(JSON.stringify({ op, d }));
  return { dispatches, next, send, close: () => ws.close() };
}
