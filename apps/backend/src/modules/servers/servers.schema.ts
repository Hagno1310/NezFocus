import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

const id = () => bigint({ mode: 'bigint' });
const tz = () => timestamp({ withTimezone: true });

// SRS 8.2. Columns arrive with the tickets that use them (icon, soft-delete, slow mode…).
export const servers = pgTable('servers', {
  id: id().primaryKey(), // Snowflake; also the id of its @everyone role
  name: varchar({ length: 100 }).notNull(),
  ownerId: id()
    .notNull()
    .references(() => users.id),
  template: varchar({ length: 20 }).notNull().default('general'), // general | study_server
  iconKey: text(), // prefix of the webp sizes (attachments/media.ts); NULL → initials
  // Kênh tin chào mừng (REQ-SRV-01 v1.9): a text channel of this server; NULL = "Không gửi".
  systemChannelId: id().references((): AnyPgColumn => channels.id, {
    onDelete: 'set null',
  }),
  createdAt: tz().notNull().defaultNow(),
});

export const ChannelTypeCode = { category: 0, text: 1, voice: 2 } as const;

export const channels = pgTable(
  'channels',
  {
    id: id().primaryKey(),
    serverId: id().references(() => servers.id, { onDelete: 'cascade' }), // NULL for DMs
    parentId: id().references((): AnyPgColumn => channels.id, {
      onDelete: 'set null', // REQ-SRV-02 AC5
    }),
    type: smallint().notNull(), // 0 category, 1 text, 2 voice, 3 DM, 4 group DM
    name: varchar({ length: 100 }),
    position: integer().notNull().default(0),
    focusControl: varchar({ length: 10 }).notNull().default('off'), // everyone | managers | off
    permissionsSynced: boolean().notNull().default(true),
    createdAt: tz().notNull().defaultNow(),
    // REQ-SRV-02: deleting is a soft-delete; every read of live channels filters on it.
    deletedAt: tz(),
  },
  (t) => [
    check(
      'channels_dm_has_no_server',
      sql`(${t.type} IN (3, 4)) = (${t.serverId} IS NULL)`,
    ),
    index('idx_channels_server')
      .on(t.serverId)
      .where(sql`${t.serverId} IS NOT NULL`),
  ],
);

// REQ-ROLE-03: a channel's or category's allow / deny for one role (server id = @everyone)
// or member. target_id has no FK: it points at a role or a user.
export const OverwriteTargetCode = { role: 0, member: 1 } as const;

export const channelPermissionOverwrites = pgTable(
  'channel_permission_overwrites',
  {
    channelId: id()
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    targetId: id().notNull(),
    targetType: smallint().notNull(), // OverwriteTargetCode
    allow: bigint({ mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    deny: bigint({ mode: 'bigint' })
      .notNull()
      .default(sql`0`),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.targetId, t.targetType] }),
    check('overwrite_allow_deny_disjoint', sql`(${t.allow} & ${t.deny}) = 0`),
  ],
);

export const roles = pgTable(
  'roles',
  {
    id: id().primaryKey(), // @everyone: id = server_id
    serverId: id()
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    name: varchar({ length: 100 }).notNull(),
    permissions: bigint({ mode: 'bigint' })
      .notNull()
      .default(sql`0`), // 8.5.1 bitmap; drizzle-kit cannot write a 0n default
    position: integer().notNull().default(0), // higher = more senior; @everyone = 0
    color: integer().notNull().default(0), // v1.7: kept for v1.x, the app never shows it
    isHoisted: boolean().notNull().default(false), // v1.7: same
    isMentionable: boolean().notNull().default(false),
    createdAt: tz().notNull().defaultNow(),
  },
  (t) => [
    unique('roles_id_server_id_unique').on(t.id, t.serverId),
    index('idx_roles_server').on(t.serverId),
  ],
);

export const serverMembers = pgTable(
  'server_members',
  {
    serverId: id()
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    userId: id()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: tz().notNull().defaultNow(),
    timeoutUntil: tz(), // CR-28 #17: until then only VIEW_CHANNEL (set by P3-A3 #23)
  },
  (t) => [
    primaryKey({ columns: [t.serverId, t.userId] }),
    index('idx_server_members_user').on(t.userId),
  ],
);

export const serverMemberRoles = pgTable(
  'server_member_roles',
  {
    serverId: id().notNull(),
    userId: id().notNull(),
    roleId: id().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.serverId, t.userId, t.roleId] }),
    foreignKey({
      columns: [t.serverId, t.userId],
      foreignColumns: [serverMembers.serverId, serverMembers.userId],
    }).onDelete('cascade'),
    // v1.3: the role must belong to the same server
    foreignKey({
      columns: [t.roleId, t.serverId],
      foreignColumns: [roles.id, roles.serverId],
    }).onDelete('cascade'),
  ],
);

export type ServerRow = typeof servers.$inferSelect;
export type ChannelRow = typeof channels.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
export type OverwriteRow = typeof channelPermissionOverwrites.$inferSelect;
