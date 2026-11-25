import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// SRS 8.7 DM list: S-DM-01 opens from here before READY; json = the whole DmChannel.
export const dmChannels = sqliteTable('dm_channels', {
  channelId: text('channel_id').primaryKey(),
  json: text().notNull(),
});
