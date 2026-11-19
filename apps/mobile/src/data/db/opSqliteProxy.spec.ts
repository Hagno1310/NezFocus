import { DatabaseSync } from 'node:sqlite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { describe, expect, it } from 'vitest';
import { opSqliteProxy } from './opSqliteProxy';
import { kv } from './schema';

// op-sqlite 19's executeRaw, played by node:sqlite: rows as arrays under `rawRows`.
function fakeOpSqlite() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('create table kv (key text primary key, value text not null)');
  return {
    executeRaw: async (query: string, params: unknown[] = []) => {
      const statement = sqlite.prepare(query);
      statement.setReturnArrays(true);
      const rawRows = /^\s*select/i.test(query)
        ? (statement.all(...(params as never[])) as unknown as never[][])
        : (statement.run(...(params as never[])), []);
      return { rawRows };
    },
  };
}

describe('opSqliteProxy (drizzle on op-sqlite 19)', () => {
  it('writes, reads all rows and one row', async () => {
    const db = drizzle(opSqliteProxy(fakeOpSqlite()));
    await db.insert(kv).values([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ]);
    expect(await db.select().from(kv)).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ]);
    expect(await db.select().from(kv).where(eq(kv.key, 'b')).get()).toEqual({
      key: 'b',
      value: '2',
    });
    expect(
      await db.select().from(kv).where(eq(kv.key, 'none')).get(),
    ).toBeUndefined();
  });
});
