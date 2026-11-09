import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { SnowflakeGenerator } from '../common/snowflake.js';
import { seedServers } from '../modules/servers/servers.seed.js';
import { seedStudy } from '../modules/study/study.seed.js';
import { seedUsers } from '../modules/users/users.seed.js';
import type { Db } from './db.module.js';
import * as schema from './schema.js';

export type SeedContext = { db: Db; ids: SnowflakeGenerator; now: Date };

// WORKFLOW 4.4: each module owner adds one line here, in dependency order (users first).
const seeds: ((ctx: SeedContext) => Promise<void>)[] = [
  seedUsers,
  seedServers,
  seedStudy,
];

export function assertNotProduction(nodeEnv: string | undefined) {
  if (nodeEnv === 'production')
    throw new Error('db:seed refuses to run with NODE_ENV=production');
}

export async function runSeeds(ctx: SeedContext) {
  for (const seed of seeds) await seed(ctx);
}

// realpath on both sides: Windows drive-letter case or a junction would make a plain compare miss.
const isEntry = () =>
  !!process.argv[1] &&
  realpathSync(process.argv[1]) ===
    realpathSync(fileURLToPath(import.meta.url));

// `pnpm --filter backend db:seed`; importing this file (tests) runs nothing.
if (isEntry()) {
  assertNotProduction(process.env.NODE_ENV);
  if (!process.env.DATABASE_URL) throw new Error('db:seed needs DATABASE_URL');
  const db = drizzle(process.env.DATABASE_URL, {
    schema,
    casing: 'snake_case',
  }) as Db;
  try {
    await runSeeds({
      db,
      ids: new SnowflakeGenerator(Number(process.env.WORKER_ID ?? 0)),
      now: new Date(),
    });
  } finally {
    await db.$client.end();
  }
}
