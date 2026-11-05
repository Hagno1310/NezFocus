import { randomUUID } from 'node:crypto';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TERMS_VERSION } from '@nezfocus/shared';
import request from 'supertest';
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

export async function createTestApp() {
  const mailer = new CapturingMailer();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  })
    .overrideProvider(AuthMailer)
    .useValue(mailer)
    .compile();
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
