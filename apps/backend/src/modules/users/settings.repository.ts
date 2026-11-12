import { Inject, Injectable } from '@nestjs/common';
import {
  timezoneLockedUntil,
  type ThemePreference,
  type UserSettings,
} from '@nezfocus/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { serverMembers } from '../servers/servers.schema.js';
import { userServerSettings } from './user-server-settings.schema.js';
import { userSettings } from './users.schema.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type SettingsChange = {
  columns: Partial<
    Pick<
      typeof userSettings.$inferInsert,
      | 'theme'
      | 'locale'
      | 'allowDmFromServerMembers'
      | 'showStudyActivity'
      | 'hidePushContent'
      | 'focusSoundAlways'
    >
  >;
  timezone?: string;
  serverAllowDm?: Record<string, boolean>;
};

export type ApplyResult =
  | {
      ok: true;
      before: UserSettings;
      after: UserSettings;
      timezoneChanged: boolean;
    }
  | { ok: false; lockedUntil: Date };

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  read(userId: bigint): Promise<UserSettings> {
    return readWith(this.db, userId);
  }

  // REQ-DM-02: the servers among `serverIds` the user is a member of.
  async memberServerIds(userId: bigint, serverIds: bigint[]) {
    if (!serverIds.length) return [];
    const rows = await this.db
      .select({ id: serverMembers.serverId })
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.userId, userId),
          inArray(serverMembers.serverId, serverIds),
        ),
      );
    return rows.map((r) => r.id);
  }

  // One transaction: a locked time zone (STUDY-03 AC4) changes nothing else either. The row
  // lock makes two devices changing the zone at once see each other's change.
  apply(
    userId: bigint,
    change: SettingsChange,
    now: Date,
  ): Promise<ApplyResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${userSettings} where ${userSettings.userId} = ${userId} for update`,
      );
      const before = await readWith(tx, userId);
      const timezoneChanged =
        change.timezone !== undefined && change.timezone !== before.timezone;
      if (timezoneChanged) {
        const lockedUntil = timezoneLockedUntil(
          before.timezone_changed_at,
          now,
        );
        if (lockedUntil) return { ok: false, lockedUntil };
      }
      await tx
        .update(userSettings)
        .set({
          ...change.columns,
          ...(timezoneChanged && {
            timezone: change.timezone,
            timezoneChangedAt: now,
          }),
          updatedAt: now,
        })
        .where(eq(userSettings.userId, userId));
      const overrides = Object.entries(change.serverAllowDm ?? {});
      if (overrides.length)
        await tx
          .insert(userServerSettings)
          .values(
            overrides.map(([serverId, allowDm]) => ({
              userId,
              serverId: BigInt(serverId),
              allowDm,
            })),
          )
          .onConflictDoUpdate({
            target: [userServerSettings.userId, userServerSettings.serverId],
            set: { allowDm: sql`excluded.allow_dm` },
          });
      return {
        ok: true,
        before,
        after: await readWith(tx, userId),
        timezoneChanged,
      };
    });
  }
}

async function readWith(db: Db | Tx, userId: bigint): Promise<UserSettings> {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (!row) throw new Error(`no user_settings for ${userId}`);
  const overrides = await db
    .select({
      serverId: userServerSettings.serverId,
      allowDm: userServerSettings.allowDm,
    })
    .from(userServerSettings)
    .where(eq(userServerSettings.userId, userId));
  return {
    theme: row.theme as ThemePreference,
    locale: row.locale as UserSettings['locale'],
    timezone: row.timezone,
    timezone_changed_at: row.timezoneChangedAt?.toISOString() ?? null,
    allow_dm_from_server_members: row.allowDmFromServerMembers,
    server_allow_dm: Object.fromEntries(
      overrides.flatMap((o) =>
        o.allowDm === null ? [] : [[o.serverId.toString(), o.allowDm]],
      ),
    ),
    show_study_activity: row.showStudyActivity,
    hide_push_content: row.hidePushContent,
    focus_sound_always: row.focusSoundAlways,
  };
}
