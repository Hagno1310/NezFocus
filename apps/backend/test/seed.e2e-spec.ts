import { randomInt } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { SnowflakeGenerator } from '../src/common/snowflake.js';
import { DB, type Db } from '../src/db/db.module.js';
import { runSeeds } from '../src/db/seed.js';
import { DEV_PASSWORD, SAMPLE_USERS } from '../src/modules/users/users.seed.js';
import { users, userSettings } from '../src/modules/users/users.schema.js';
import {
  CapturingMailer,
  createTestApp,
  device,
  http,
  signInWithCode,
  uniqueEmail,
} from './helpers.js';

// P0-7 against the real dev schema. Needs `pnpm dev:infra`.
describe('db:seed (e2e)', () => {
  let app: INestApplication;
  let mailer: CapturingMailer;
  let db: Db;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    db = app.get(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  const seed = () =>
    runSeeds({ db, ids: app.get(SnowflakeGenerator), now: new Date() });

  const sampleRows = () =>
    db
      .select({ username: users.username })
      .from(users)
      .where(
        inArray(
          users.username,
          SAMPLE_USERS.map((u) => u.username),
        ),
      );

  it('creates every sample account once, keeps accounts people made, and An can sign in', async () => {
    const own = await signInWithCode(app, mailer, uniqueEmail('thu'));

    await seed();
    await seed();

    const rows = await sampleRows();
    expect(rows.map((r) => r.username).sort()).toEqual(
      SAMPLE_USERS.map((u) => u.username).sort(),
    );
    const settings = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .innerJoin(users, eq(users.id, userSettings.userId))
      .where(
        inArray(
          users.username,
          SAMPLE_USERS.map((u) => u.username),
        ),
      );
    expect(settings).toHaveLength(SAMPLE_USERS.length);

    const [kept] = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, [BigInt(own.user.id)]));
    expect(kept).toBeDefined();

    const signedIn = await http(app)
      .post('/auth/login')
      .set(
        'X-Forwarded-For',
        `198.51.${randomInt(0, 256)}.${randomInt(1, 255)}`,
      )
      .send({
        email: 'an.nguyen@gmail.com',
        password: DEV_PASSWORD,
        device: device(),
      })
      .expect(200);
    expect(signedIn.body.user).toMatchObject({
      username: 'an.nguyen',
      display_name: 'An',
      account_completed: true,
    });
  });
});
