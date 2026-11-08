import { planCategoryDelete, type ChannelResponse } from '@nezfocus/shared';
import { serverRepository } from '../../../data/servers';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  createChannel,
  deleteChannel,
  moveChannel,
  renameChannel,
  type ChannelActionError,
  type CreateChannelForm,
  type DropTarget,
} from '../../../domain/servers/channels';
import {
  applyChannels,
  applyGatewayEvent,
  homeStore,
  markOwnDelete,
  removeChannel,
  unmarkOwnDelete,
  upsertChannel,
} from '../../../domain/servers/homeStore';

const channelsOf = (serverId: string) =>
  homeStore.getState().channels[serverId] ?? [];

type Done = { ok: true } | { ok: false; error: ChannelActionError };

// REQ-SRV-02 for the screens: each action runs its use case against the repository and
// puts the answer into the drawer's store before (or instead of) the CHANNEL_* event.
export function useChannelActions(serverId: string) {
  return {
    // S-SET-09. Offline never reaches the API ("Cần kết nối mạng để tạo kênh").
    async create(form: CreateChannelForm) {
      if (!gatewayStore.getState().online)
        return { ok: false as const, error: { kind: 'network' as const } };
      const result = await createChannel(
        serverRepository,
        serverId,
        channelsOf(serverId),
        form,
      );
      if (result.ok)
        applyGatewayEvent({ t: 'CHANNEL_CREATE', d: result.channel, s: 0 });
      return result;
    },

    // S-SET-06 overview, `category-rename`.
    async rename(channel: ChannelResponse, name: string) {
      const result = await renameChannel(
        serverRepository,
        channelsOf(serverId),
        channel,
        name,
      );
      if (result.ok) upsertChannel(result.channel);
      return result;
    },

    // `delete-confirm`. Marked first: its CHANNEL_DELETE may arrive before the answer, and
    // this phone's own delete closes the screens without "Kênh này đã bị xóa".
    async remove(channel: ChannelResponse): Promise<Done> {
      markOwnDelete(channel.id);
      const result = await deleteChannel(serverRepository, channel.id);
      if (!result.ok) {
        unmarkOwnDelete(channel.id);
        return result;
      }
      // SRV-01 v1.9: deleting the welcome channel stops the welcome messages.
      const server = homeStore
        .getState()
        .servers?.find((s) => s.id === serverId);
      if (server?.system_channel_id === channel.id)
        applyGatewayEvent({
          t: 'SERVER_UPDATE',
          d: { ...server, system_channel_id: null },
          s: 0,
        });
      removeChannel(channel);
      return { ok: true };
    },

    // `category-delete-confirm`: the children join the top group (SRV-02 AC5).
    async removeCategory(category: ChannelResponse): Promise<Done> {
      const plan = planCategoryDelete(channelsOf(serverId), category);
      const result = await deleteChannel(serverRepository, category.id);
      if (!result.ok) return result;
      if (plan.ok) applyChannels(plan.moved);
      removeChannel(category);
      return { ok: true };
    },

    // S-HOME-02 `reordering` drop.
    move(channelId: string, target: DropTarget) {
      return moveChannel(
        serverRepository,
        serverId,
        channelsOf(serverId),
        channelId,
        target,
        applyChannels,
      );
    },
  };
}
