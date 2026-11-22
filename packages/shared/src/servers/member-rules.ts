// What sorting and search read of a member row.
type Named = {
  user: { display_name: string | null; username: string | null };
};

// NFR-I18N-03: search ignores Vietnamese marks ("đ" = "d") and case.
export const searchKey = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');

export const memberName = (m: Named) =>
  m.user.display_name ?? m.user.username ?? '';

const byVietnamese = (a: string, b: string) => a.localeCompare(b, 'vi');

// Spec 08 S-SET-03 / 02 S-HOME-03: by name (Vietnamese alphabet), tie → username.
export const compareMembers = (a: Named, b: Named) =>
  byVietnamese(memberName(a), memberName(b)) ||
  byVietnamese(a.user.username ?? '', b.user.username ?? '');

export function matchesMember(m: Named, query: string) {
  const q = searchKey(query.trim());
  return (
    !q ||
    searchKey(memberName(m)).includes(q) ||
    searchKey(m.user.username ?? '').includes(q)
  );
}

// The sort key of the last row, so a row leaving between pages shifts nothing.
export const memberCursor = (m: Named) =>
  JSON.stringify([memberName(m), m.user.username ?? '']);

function readCursor(cursor: string): Named | null {
  try {
    const [name, username] = JSON.parse(cursor) as unknown[];
    if (typeof name !== 'string' || typeof username !== 'string') return null;
    return { user: { display_name: name, username } };
  } catch {
    return null;
  }
}

// `sorted` is already in compareMembers order; an unreadable cursor starts at the top.
export function pageMembers<T extends Named>(
  sorted: readonly T[],
  cursor: string | undefined,
  limit: number,
): { members: T[]; next_cursor: string | null } {
  const after = cursor ? readCursor(cursor) : null;
  const rest = after
    ? sorted.filter((m) => compareMembers(m, after) > 0)
    : sorted;
  const members = rest.slice(0, limit);
  return {
    members,
    next_cursor:
      rest.length > limit ? memberCursor(members[members.length - 1]!) : null,
  };
}
