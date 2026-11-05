import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// e2e runs against a real Postgres (`pnpm dev:infra` locally, a service in CI): bring it to the latest schema.
export default async function setup() {
  try {
    process.loadEnvFile('.env');
  } catch {
    // CI sets the variables directly.
  }
  const db = drizzle(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: 'drizzle' });
  await db.$client.end();
}
