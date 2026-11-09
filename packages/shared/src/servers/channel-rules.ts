import { findDuplicateChannel } from './channel-names.js';
import type {
  ChannelResponse,
  UpdateChannelPositionsRequest,
} from './channel.contract.js';

// REQ-SRV-02 rules that only need the server's live channels. The backend checks a whole
// move or delete before it writes; the app checks the same before it calls the API
// (`drop-blocked`, `category-delete-blocked`), so the two never disagree.

export type NamedChannel = Pick<
  ChannelResponse,
  'id' | 'type' | 'name' | 'parent_id'
>;
type Named = NamedChannel;

// Channels and categories, never DMs: what a duplicate or a drawer row can be.
export type ServerChannelKind = 'text' | 'voice';

// Category names show in capitals in the drawer and in every sentence about them.
export const categoryTitle = (name: string) => name.toLocaleUpperCase('vi');

export const byPosition = (a: ChannelResponse, b: ChannelResponse) =>
  a.position - b.position || a.id.localeCompare(b.id);

// The channel already holding the name, as the field `name` sentences need it
// (REQ-SRV-02 v1.9; spec 08 › S-SET-06 "Không trùng tên"). `category`: the name of the
// category it sits in, null for the uncategorized group.
export type DuplicateName =
  | { kind: 'category'; name: string }
  | {
      kind: 'channel';
      type: ServerChannelKind;
      name: string;
      category: string | null;
    };

export function describeDuplicate(
  channels: readonly Named[],
  existing: Named,
): DuplicateName {
  if (existing.type === 'category')
    return { kind: 'category', name: existing.name };
  const category = channels.find((c) => c.id === existing.parent_id);
  return {
    kind: 'channel',
    type: existing.type,
    name: existing.name,
    category: category?.name ?? null,
  };
}

// The field `name` sentences of REQ-SRV-02 v1.9 as the backend sends them (Vietnamese
// only, like NO_LETTER_OR_DIGIT_MESSAGE; the app shows its own i18n sentence when it can).
// Spec 08 › S-SET-06 "Không trùng tên": a text channel is "kênh #tên", a voice one "phòng Tên".
export function duplicateNameMessage(d: DuplicateName): string {
  if (d.kind === 'category')
    return `Server đã có danh mục ${categoryTitle(d.name)}`;
  const what = d.type === 'text' ? `kênh #${d.name}` : `phòng ${d.name}`;
  return d.category === null
    ? `Trên cùng danh sách đã có ${what}`
    : `${categoryTitle(d.category)} đã có ${what}`;
}

export type ChannelRuleError =
  | { ok: false; reason: 'unknown-channel'; id: string }
  | { ok: false; reason: 'not-a-category' }
  | { ok: false; reason: 'duplicate'; duplicate: DuplicateName };

// The first of `changed` that clashes once the server looks like `next`.
export function findClash(
  next: readonly ChannelResponse[],
  changed: readonly Parameters<typeof findDuplicateChannel>[1][],
): ChannelRuleError | null {
  for (const channel of changed) {
    const existing = findDuplicateChannel(next, channel);
    if (existing)
      return {
        ok: false,
        reason: 'duplicate',
        duplicate: describeDuplicate(next, existing),
      };
  }
  return null;
}

// REQ-ROLE-03 v1.8: a channel that changes category keeps following its category; taken
// out of every category it stops, keeping the overwrites in force as its own.
const leaving = (
  c: ChannelResponse,
  parentId: string | null,
  byId: ReadonlyMap<string, ChannelResponse>,
): Partial<ChannelResponse> => {
  if (parentId !== null || c.parent_id === null) return {};
  if (!c.permissions_synced) return { permissions_synced: false };
  return {
    permissions_synced: false,
    permission_overwrites: byId.get(c.parent_id)?.permission_overwrites ?? [],
  };
};

// REQ-SRV-02 AC1 (v1.8: positions carry parent_id). Returns only the channels that change.
export function applyPositions(
  channels: readonly ChannelResponse[],
  patch: UpdateChannelPositionsRequest,
): { ok: true; changed: ChannelResponse[] } | ChannelRuleError {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const moved = new Map<string, ChannelResponse>();
  for (const { id, position, parent_id } of patch) {
    const channel = byId.get(id);
    if (!channel || seen.has(id))
      return { ok: false, reason: 'unknown-channel', id };
    seen.add(id);
    if (parent_id !== null) {
      const parent = byId.get(parent_id);
      if (channel.type === 'category' || parent?.type !== 'category')
        return { ok: false, reason: 'not-a-category' };
    }
    const next = {
      ...channel,
      position,
      parent_id,
      ...leaving(channel, parent_id, byId),
    };
    if (
      next.position !== channel.position ||
      next.parent_id !== channel.parent_id
    )
      moved.set(id, next);
  }
  const changed = [...moved.values()];
  const next = channels.map((c) => moved.get(c.id) ?? c);
  return findClash(next, changed) ?? { ok: true, changed };
}

// REQ-SRV-02 AC5: the children join the top group after its channels, keeping their order.
export function planCategoryDelete(
  channels: readonly ChannelResponse[],
  category: ChannelResponse,
): { ok: true; moved: ChannelResponse[] } | ChannelRuleError {
  const top = channels.filter(
    (c) => c.type !== 'category' && c.parent_id === null,
  );
  let position = Math.max(-1, ...top.map((c) => c.position));
  const byId = new Map(channels.map((c) => [c.id, c]));
  const moved = channels
    .filter((c) => c.parent_id === category.id)
    .sort(byPosition)
    .map((c) => ({
      ...c,
      parent_id: null,
      position: ++position,
      ...leaving(c, null, byId),
    }));
  const movedIds = new Set(moved.map((c) => c.id));
  const next = [
    ...channels.filter((c) => c.id !== category.id && !movedIds.has(c.id)),
    ...moved,
  ];
  return findClash(next, moved) ?? { ok: true, moved };
}
