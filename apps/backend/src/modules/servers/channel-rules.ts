import {
  findDuplicateChannel,
  type ChannelResponse,
  type UpdateChannelPositionsRequest,
} from '@nezfocus/shared';

// REQ-SRV-02 rules that only need the server's live channels, kept free of the database
// so the service can check a whole move or delete before it writes anything.

type Named = Pick<ChannelResponse, 'id' | 'type' | 'name' | 'parent_id'>;

export type RuleError = {
  ok: false;
  field: 'id' | 'parent_id' | 'name';
  code: string;
  message: string;
};

const upper = (name: string) => name.toLocaleUpperCase('vi');
const label = (c: Named) => (c.type === 'text' ? `#${c.name}` : c.name);

// The three field `name` sentences of REQ-SRV-02 v1.9, about the channel already there.
export function duplicateNameMessage(
  channels: readonly Named[],
  existing: Named,
): string {
  if (existing.type === 'category')
    return `Server đã có danh mục ${upper(existing.name)}`;
  const category = channels.find((c) => c.id === existing.parent_id);
  return category
    ? `${upper(category.name)} đã có kênh ${label(existing)}`
    : `Trên cùng danh sách đã có kênh ${label(existing)}`;
}

// The first of `changed` that clashes once the server looks like `next`.
export function findClash(
  next: readonly ChannelResponse[],
  changed: readonly ChannelResponse[],
): RuleError | null {
  for (const channel of changed) {
    const existing = findDuplicateChannel(next, channel);
    if (existing)
      return {
        ok: false,
        field: 'name',
        code: 'DUPLICATE_NAME',
        message: duplicateNameMessage(next, existing),
      };
  }
  return null;
}

const fail = (
  field: RuleError['field'],
  code: string,
  message: string,
): RuleError => ({ ok: false, field, code, message });

// REQ-ROLE-03 v1.8: a channel that changes category keeps following its category;
// taken out of every category it stops (copying the overwrites lands with P1-A3.4 #67).
const synced = (c: ChannelResponse, parentId: string | null) =>
  parentId === null && c.parent_id !== null ? false : c.permissions_synced;

// REQ-SRV-02 AC1 (v1.8: positions carry parent_id). Returns only the channels that change.
export function applyPositions(
  channels: readonly ChannelResponse[],
  patch: UpdateChannelPositionsRequest,
): { ok: true; changed: ChannelResponse[] } | RuleError {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const moved = new Map<string, ChannelResponse>();
  for (const { id, position, parent_id } of patch) {
    const channel = byId.get(id);
    if (!channel || seen.has(id))
      return fail('id', 'UNKNOWN_CHANNEL', `Unknown or repeated channel ${id}`);
    seen.add(id);
    if (parent_id !== null) {
      const parent = byId.get(parent_id);
      if (channel.type === 'category' || parent?.type !== 'category')
        return fail(
          'parent_id',
          'NOT_A_CATEGORY',
          'Only a text or voice channel goes into a category',
        );
    }
    const next = {
      ...channel,
      position,
      parent_id,
      permissions_synced: synced(channel, parent_id),
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
): { ok: true; moved: ChannelResponse[] } | RuleError {
  const top = channels.filter(
    (c) => c.type !== 'category' && c.parent_id === null,
  );
  let position = Math.max(-1, ...top.map((c) => c.position));
  const moved = channels
    .filter((c) => c.parent_id === category.id)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .map((c) => ({
      ...c,
      parent_id: null,
      position: ++position,
      permissions_synced: synced(c, null),
    }));
  const movedIds = new Set(moved.map((c) => c.id));
  const next = [
    ...channels.filter((c) => c.id !== category.id && !movedIds.has(c.id)),
    ...moved,
  ];
  return findClash(next, moved) ?? { ok: true, moved };
}
