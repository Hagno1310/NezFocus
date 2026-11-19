import type { Scalar } from '@op-engineering/op-sqlite';
import type { AsyncRemoteCallback } from 'drizzle-orm/sqlite-proxy';

type ExecuteRaw = (
  query: string,
  params?: Scalar[],
) => Promise<{ rawRows: Scalar[][] }>;

// drizzle-orm/op-sqlite calls the pre-v15 API (executeRawAsync, rows._array) that op-sqlite 19 removed.
export const opSqliteProxy =
  (sqlite: { executeRaw: ExecuteRaw }): AsyncRemoteCallback =>
  async (query, params, method) => {
    const { rawRows } = await sqlite.executeRaw(query, params as Scalar[]);
    // `get` without a row hands drizzle undefined, which it returns as "no row".
    return { rows: method === 'get' ? (rawRows[0] as Scalar[]) : rawRows };
  };
