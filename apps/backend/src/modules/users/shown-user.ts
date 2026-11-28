import { sql } from 'drizzle-orm';
import { users } from './users.schema.js';

// REQ-AUTH-10 AC5, DEC-28: from the deletion request on, others see "Tài khoản đã bị xóa"
// (id kept, no name, default avatar) — the app draws it from the nulls.
const gone = sql`${users.accountStatus} IN ('pending_deletion', 'deleted')`;
const unlessGone = <T>(
  column:
    typeof users.username | typeof users.displayName | typeof users.avatarKey,
) => sql<T | null>`CASE WHEN ${gone} THEN NULL ELSE ${column} END`;

export const shownUser = {
  username: unlessGone<string>(users.username),
  displayName: unlessGone<string>(users.displayName),
  avatarKey: unlessGone<string>(users.avatarKey),
};
