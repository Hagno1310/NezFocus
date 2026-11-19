import { open, type DB } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import migrations from '../../../drizzle/migrations';
import * as schema from './schema';
import type { LocalDb } from './types';

const NAME = 'nezfocus.db';

let opened: { sqlite: DB; db: Promise<LocalDb> } | null = null;

// SRS 8.7: opened at first use after sign-in, migrated before anyone reads it.
export function localDb(): Promise<LocalDb> {
  if (!opened) {
    const sqlite = open({ name: NAME });
    const db = drizzle(sqlite, { schema });
    opened = { sqlite, db: migrate(db, migrations).then(() => db) };
  }
  return opened.db;
}

// AUTH-07: signing out deletes the file; what must outlive it is kept elsewhere (8.7 v1.9).
export async function wipeLocalDb() {
  const current = opened;
  opened = null;
  if (current) {
    await current.db.catch(() => {});
    current.sqlite.delete();
    return;
  }
  try {
    open({ name: NAME }).delete();
  } catch {
    // no file yet
  }
}
