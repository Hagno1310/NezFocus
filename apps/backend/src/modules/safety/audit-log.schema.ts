import {
  bigint,
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const id = () => bigint({ mode: 'bigint' });

// SRS 8.2 audit_logs (REQ-ROLE-09, NFR-SEC-05): append-only, no FK, so purging a server or a
// user keeps its entries.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id().primaryKey(),
    serverId: id().notNull(),
    actorId: id().notNull(),
    targetId: id(),
    actionType: varchar({ length: 50 }).notNull(),
    reason: varchar({ length: 512 }),
    changes: jsonb().$type<AuditChanges>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_audit_server_time').on(t.serverId, t.createdAt.desc())],
);

export type AuditChanges = { before?: unknown; after?: unknown };
export type AuditLogRow = typeof auditLogs.$inferSelect;
