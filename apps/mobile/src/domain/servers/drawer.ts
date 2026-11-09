import type {
  ChannelResponse,
  DispatchEvent,
  RoleResponse,
  ServerSummary,
} from '@nezfocus/shared';
import { firstTextChannel } from './createServer';

// S-HOME-02 drawer state. Servers come from READY (oldest joined first, the rail order);
// a server's channels are fetched when it is first shown, then kept up by Gateway events.

export type OpenChannel = { serverId: string; channelId: string };

export type HomeState = {
  servers: ServerSummary[] | null; // null until READY
  selectedServerId: string | null; // the server whose channels the drawer lists
  channels: Record<string, ChannelResponse[]>; // server id → channels the caller may view
  roles: Record<string, RoleResponse[]>; // server id → roles (rows shown by permission)
  myRoleIds: Record<string, string[]>; // server id → the caller's roles, without @everyone
  open: OpenChannel | null; // the channel on screen
  collapsed: Record<string, string[]>; // server id → collapsed category ids (per device)
};

export const emptyHome: HomeState = {
  servers: null,
  selectedServerId: null,
  channels: {},
  roles: {},
  myRoleIds: {},
  open: null,
  collapsed: {},
};

// C-26: the first letters of the first two words, upper-cased ("Ôn thi…" → "ÔT").
export const railInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('')
    .toLocaleUpperCase('vi');

export type ChannelSection = {
  category: ChannelResponse | null; // null: the uncategorized group, no header (v1.8)
  collapsed: boolean;
  rows: ChannelResponse[];
};

const byPosition = (a: ChannelResponse, b: ChannelResponse) =>
  a.position - b.position || a.id.localeCompare(b.id);

// Uncategorized channels first, then each category in order. A collapsed category keeps
// only the selected channel under its header.
export function channelSections(
  channels: readonly ChannelResponse[],
  collapsed: ReadonlySet<string>,
  selectedId: string | null,
): ChannelSection[] {
  const categories = channels
    .filter((c) => c.type === 'category')
    .sort(byPosition);
  const known = new Set(categories.map((c) => c.id));
  const rowsOf = (parent: string | null) =>
    channels
      .filter(
        (c) =>
          c.type !== 'category' &&
          (parent === null
            ? c.parent_id === null || !known.has(c.parent_id)
            : c.parent_id === parent),
      )
      .sort(byPosition);

  const top = rowsOf(null);
  const sections: ChannelSection[] = top.length
    ? [{ category: null, collapsed: false, rows: top }]
    : [];
  for (const category of categories) {
    const isCollapsed = collapsed.has(category.id);
    const rows = rowsOf(category.id);
    sections.push({
      category,
      collapsed: isCollapsed,
      rows: isCollapsed ? rows.filter((r) => r.id === selectedId) : rows,
    });
  }
  return sections;
}

const upsert = <T extends { id: string }>(list: readonly T[], item: T) =>
  list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];

function apply(s: HomeState, e: DispatchEvent): HomeState {
  switch (e.t) {
    case 'READY': {
      const servers = e.d.servers;
      const has = (id: string | null | undefined) =>
        servers.some((x) => x.id === id);
      // A reconnect may have missed events: refetch the channels of what is shown.
      return {
        ...s,
        servers,
        channels: {},
        roles: {},
        myRoleIds: {},
        selectedServerId: has(s.selectedServerId)
          ? s.selectedServerId
          : (servers[0]?.id ?? null),
        open: has(s.open?.serverId) ? s.open : null,
      };
    }
    case 'SERVER_CREATE': {
      const { channels, roles, me, ...server } = e.d;
      return {
        ...s,
        servers: upsert(s.servers ?? [], server),
        channels: { ...s.channels, [server.id]: channels },
        roles: { ...s.roles, [server.id]: roles },
        myRoleIds: { ...s.myRoleIds, [server.id]: me.role_ids },
      };
    }
    // REQ-ROLE-01: kept up only for a server whose roles were fetched.
    case 'SERVER_ROLE_CREATE':
    case 'SERVER_ROLE_UPDATE': {
      const list = s.roles[e.d.server_id];
      if (!list) return s;
      return {
        ...s,
        roles: { ...s.roles, [e.d.server_id]: upsert(list, e.d.role) },
      };
    }
    case 'SERVER_ROLE_DELETE': {
      const { server_id, role_id } = e.d;
      const list = s.roles[server_id];
      if (!list) return s;
      return {
        ...s,
        roles: {
          ...s.roles,
          [server_id]: list.filter((r) => r.id !== role_id),
        },
        myRoleIds: {
          ...s.myRoleIds,
          [server_id]: (s.myRoleIds[server_id] ?? []).filter(
            (id) => id !== role_id,
          ),
        },
      };
    }
    case 'SERVER_UPDATE':
      return s.servers ? { ...s, servers: upsert(s.servers, e.d) } : s;
    case 'CHANNEL_CREATE':
    case 'CHANNEL_UPDATE':
    case 'CHANNEL_DELETE': {
      const list = s.channels[e.d.server_id];
      if (!list) return s; // fetched in full when the server is shown
      const next =
        e.t === 'CHANNEL_DELETE'
          ? list.filter((c) => c.id !== e.d.id)
          : upsert(list, e.d);
      return { ...s, channels: { ...s.channels, [e.d.server_id]: next } };
    }
    default:
      return s;
  }
}

// Edge case `channel-removed`: the open channel left the list (deleted, or no longer
// viewable) → the first text channel left, and the old name for the toast.
export function reduceHome(
  prev: HomeState,
  e: DispatchEvent,
): { state: HomeState; removed?: string } {
  const state = apply(prev, e);
  if (state === prev) return { state };
  const open = state.open;
  const before = open && prev.channels[open.serverId];
  const after = open && state.channels[open.serverId];
  const was = before?.find((c) => c.id === open!.channelId);
  if (!open || !after || !was || after.some((c) => c.id === open.channelId))
    return { state };
  const next = firstTextChannel(after);
  return {
    state: {
      ...state,
      open: next ? { serverId: open.serverId, channelId: next.id } : null,
    },
    removed: was.name,
  };
}
