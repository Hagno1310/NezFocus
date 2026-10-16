import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Runs in the deploy image (drizzle-kit is dev-only). Migrations come from `pnpm db:generate`.
// Path is relative to the package root: the cwd for both `pnpm db:migrate` and the image.
const db = drizzle(process.env.DATABASE_URL!);
await migrate(db, { migrationsFolder: 'drizzle' });
await db.$client.end();
