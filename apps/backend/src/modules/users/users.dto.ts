import type { CurrentUser } from '@nezfocus/shared';
import { avatarUrls } from '../attachments/media.js';
import type { UserRow } from './users.schema.js';

export const toCurrentUser = (row: UserRow): CurrentUser => ({
  id: row.id.toString(),
  email: row.email ?? '',
  username: row.username,
  display_name: row.displayName,
  bio: row.bio,
  avatar: avatarUrls(row.avatarKey),
  account_completed: row.accountCompletedAt !== null,
  created_at: row.createdAt.toISOString(),
});
