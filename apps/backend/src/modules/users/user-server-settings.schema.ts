import { bigint, boolean, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { servers } from '../servers/servers.schema.js';
import { users } from './users.schema.js';

// SRS 8.2 `user_server_settings`, per server. notify_level, muted_until, is_priority come
// with NOTIF-03 / STUDY-09 (v1.x).
export const userServerSettings = pgTable(
  'user_server_settings',
  {
    userId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serverId: bigint({ mode: 'bigint' })
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    allowDm: boolean(), // REQ-DM-02: overrides allow_dm_from_server_members; null = follow it
  },
  (t) => [primaryKey({ columns: [t.userId, t.serverId] })],
);
