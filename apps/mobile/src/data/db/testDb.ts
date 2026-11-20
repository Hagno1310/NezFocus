import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import type { LocalDb } from './types';

// Specs only: the app's migrations on an in-memory node:sqlite, behind the same async API
// op-sqlite has. Never imported by app code (Metro would not bundle node:sqlite).
export function createTestDb(): LocalDb {
  const sqlite = new DatabaseSync(':memory:');
  const folder = join(__dirname, '../../../drizzle');
  for (const file of readdirSync(folder)
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const statement of readFileSync(join(folder, file), 'utf8').split(
      '--> statement-breakpoint',
    ))
      sqlite.exec(statement);
  return drizzle(
    async (sql, params, method) => {
      const statement = sqlite.prepare(sql);
      if (method === 'run') {
        statement.run(...params);
        return { rows: [] };
      }
      statement.setReturnArrays(true);
      if (method === 'get') return { rows: statement.get(...params) as never };
      return { rows: statement.all(...params) };
    },
    { schema },
  );
}
