// REQ-ROLE-01 order rules, shared so the app's S-SET-02 drop check and the backend agree.
// `actorHighest` comes from highestRole; @everyone is the role whose id is the server id.

type Placed = { id: string; position: number };

const byPosition = (a: Placed, b: Placed) =>
  a.position - b.position || a.id.localeCompare(b.id);

// A new role sits right below the creator's highest role, which moves up one with
// everything above it; the Owner, or someone with no role, creates at the top.
export function newRolePlace(
  serverId: string,
  roles: readonly Placed[],
  actorHighest: number | null,
): { position: number; shifted: Placed[] } {
  const others = roles.filter((r) => r.id !== serverId);
  if (actorHighest === null || actorHighest === 0)
    return {
      position: Math.max(0, ...others.map((r) => r.position)) + 1,
      shifted: [],
    };
  return {
    position: actorHighest,
    shifted: others
      .filter((r) => r.position >= actorHighest)
      .sort(byPosition)
      .map((r) => ({ id: r.id, position: r.position + 1 })),
  };
}

export type RoleReorderError = 'everyone' | 'unknown_role' | 'hierarchy';

// Applies the requested positions (a role asking for an occupied slot takes it), then
// numbers the roles 1..n. Nobody moves a role level with or above their own highest, and
// nobody lifts one there: every such role keeps its rank.
export function planRoleReorder(
  serverId: string,
  roles: readonly Placed[],
  moves: readonly Placed[],
  actorHighest: number | null,
): { ok: true; changed: Placed[] } | { ok: false; error: RoleReorderError } {
  const others = roles.filter((r) => r.id !== serverId);
  const asked = new Map(moves.map((m) => [m.id, m.position]));
  if (asked.has(serverId)) return { ok: false, error: 'everyone' };
  if (moves.some((m) => !others.some((r) => r.id === m.id)))
    return { ok: false, error: 'unknown_role' };

  const before = [...others].sort(byPosition);
  const after = before
    .map((r, i) => ({ r, i, key: asked.get(r.id) ?? r.position }))
    .sort(
      (a, b) =>
        a.key - b.key ||
        Number(asked.has(a.r.id)) - Number(asked.has(b.r.id)) ||
        a.i - b.i,
    )
    .map(({ r }) => r);

  if (actorHighest !== null) {
    const kept = before.every(
      (r, i) => r.position < actorHighest || after.indexOf(r) === i,
    );
    if (!kept) return { ok: false, error: 'hierarchy' };
  }
  return {
    ok: true,
    changed: after.flatMap((r, i) =>
      r.position === i + 1 ? [] : [{ id: r.id, position: i + 1 }],
    ),
  };
}
