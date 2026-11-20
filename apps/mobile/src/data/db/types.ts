import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

// op-sqlite on the device, node:sqlite in tests: both async drivers.
// oxlint-disable-next-line no-explicit-any -- the driver's result type differs per driver
export type LocalDb = BaseSQLiteDatabase<'async', any, typeof schema>;

// SRS 8.7 v1.3: ids stored padded to 20 digits so text order = number order.
export const padId = (id: string) => id.padStart(20, '0');
export const unpadId = (id: string) => id.replace(/^0+(?=\d)/, '');
