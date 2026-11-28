import { ACCOUNT_DELETION_DAYS, type CurrentUser } from '@nezfocus/shared';
import { avatarUrls } from '../attachments/media.js';
import type { UserRow } from './users.schema.js';

const DAY_MS = 24 * 60 * 60_000;

export const toCurrentUser = (row: UserRow): CurrentUser => ({
  id: row.id.toString(),
  email: row.email ?? '',
  username: row.username,
  display_name: row.displayName,
  bio: row.bio,
  avatar: avatarUrls(row.avatarKey),
  account_completed: row.accountCompletedAt !== null,
  created_at: row.createdAt.toISOString(),
  deletion_scheduled_at: row.deletionRequestedAt
    ? new Date(
        row.deletionRequestedAt.getTime() + ACCOUNT_DELETION_DAYS * DAY_MS,
      ).toISOString()
    : null,
});
