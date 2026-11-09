import type {
  ChannelResponse,
  DispatchEvent,
  RoleResponse,
  ServerResponse,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import {
  emptyHome,
  reduceHome,
  type HomeState,
  type OpenChannel,
} from './drawer';

export type { OpenChannel };

// The Home tab: the drawer's servers and channels, and the channel on screen (S-HOME-02).
export const homeStore = createStore<HomeState>(() => emptyHome);

// Opening a channel also shows its server in the drawer.
export const openChannel = (open: OpenChannel) =>
  homeStore.setState({ open, selectedServerId: open.serverId });

export const selectServer = (serverId: string) =>
  homeStore.setState({ selectedServerId: serverId });

// GET /servers/:id: what the drawer lists and what decides the rows shown by permission.
export const setServerDetail = ({ id, channels, roles, me }: ServerResponse) =>
  homeStore.setState((s) => ({
    channels: { ...s.channels, [id]: channels },
    roles: { ...s.roles, [id]: roles },
    myRoleIds: { ...s.myRoleIds, [id]: me.role_ids },
  }));

// GET /servers/:id/roles (S-SET-02 `list`): the newest roles, without their counts.
export const setRoles = (serverId: string, roles: readonly RoleResponse[]) =>
  homeStore.setState((s) => ({
    roles: {
      ...s.roles,
      [serverId]: roles.map(
        ({ id, name, permissions, position, is_mentionable }) => ({
          id,
          name,
          permissions,
          position,
          is_mentionable,
        }),
      ),
    },
  }));

// What a role request just answered, before (or instead of) its SERVER_ROLE_* event.
export const upsertRole = (serverId: string, role: RoleResponse) =>
  applyGatewayEvent({
    t: 'SERVER_ROLE_UPDATE',
    d: { server_id: serverId, role },
    s: 0,
  });

export const removeRole = (serverId: string, roleId: string) =>
  applyGatewayEvent({
    t: 'SERVER_ROLE_DELETE',
    d: { server_id: serverId, role_id: roleId },
    s: 0,
  });

export const setCollapsed = (serverId: string, categoryIds: string[]) =>
  homeStore.setState((s) => ({
    collapsed: { ...s.collapsed, [serverId]: categoryIds },
  }));

export const toggleCategory = (serverId: string, categoryId: string) => {
  const ids = homeStore.getState().collapsed[serverId] ?? [];
  setCollapsed(
    serverId,
    ids.includes(categoryId)
      ? ids.filter((id) => id !== categoryId)
      : [...ids, categoryId],
  );
};

// Returns the name of the open channel when the event took it away (`channel-removed`).
export function applyGatewayEvent(event: DispatchEvent): string | undefined {
  const { state, removed } = reduceHome(homeStore.getState(), event);
  homeStore.setState(state, true);
  return removed;
}

// A server just created here shows up before its SERVER_CREATE arrives.
export const addServer = (server: ServerResponse) =>
  applyGatewayEvent({ t: 'SERVER_CREATE', d: server, s: 0 });

// What a request just answered, before (or instead of) its CHANNEL_* event.
export const upsertChannel = (channel: ChannelResponse) =>
  applyGatewayEvent({ t: 'CHANNEL_UPDATE', d: channel, s: 0 });

export const applyChannels = (changed: readonly ChannelResponse[]) =>
  changed.forEach(upsertChannel);

export const removeChannel = (channel: ChannelResponse) =>
  applyGatewayEvent({ t: 'CHANNEL_DELETE', d: channel, s: 0 });

// A channel this phone deleted: its screens close without the "Kênh này đã bị xóa" toast
// (that one is for someone else deleting it, spec 08 › Edge case).
const ownDeletes = new Set<string>();
export const markOwnDelete = (channelId: string) => ownDeletes.add(channelId);
export const unmarkOwnDelete = (channelId: string) =>
  ownDeletes.delete(channelId);
export const isOwnDelete = (channelId: string) => ownDeletes.has(channelId);

export const resetHome = () => homeStore.setState(emptyHome, true);
