import { eq } from 'drizzle-orm';
import { localDb } from '.';
import { kv } from './schema';

// SRS 8.7 `kv`: small JSON values of the signed-in account, gone at sign-out with the DB.
export const localKv = {
  async get<T>(key: string): Promise<T | null> {
    const [row] = await (
      await localDb()
    )
      .select({ value: kv.value })
      .from(kv)
      .where(eq(kv.key, key));
    return row ? (JSON.parse(row.value) as T) : null;
  },
  async set(key: string, value: unknown) {
    const row = { key, value: JSON.stringify(value) };
    await (
      await localDb()
    )
      .insert(kv)
      .values(row)
      .onConflictDoUpdate({ target: kv.key, set: row });
  },
};
