import type { InvitePreview, ServerResponse } from '@nezfocus/shared';
import { useState } from 'react';
import { inviteRepository } from '../../../data/invites';
import { serverRepository } from '../../../data/servers';
import {
  joinDestination,
  joinInvite,
  memberDestination,
  type Destination,
  type JoinError,
} from '../../../domain/invites/joinInvite';
import {
  addServer,
  homeStore,
  openChannel,
  selectServer,
  setServerDetail,
} from '../../../domain/servers/homeStore';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';

// Shows the destination in Home: a text channel opens in the drawers, a room goes to its
// preview (S-ROOM-01/02 `not-joined`), never connecting voice (VC-01).
export function arrive(server: ServerResponse, to: Destination) {
  if (to.kind === 'channel')
    openChannel({ serverId: server.id, channelId: to.channelId });
  else selectServer(server.id);
}

// already-member: the server as the app knows it, fetched if its channels were never loaded.
export async function memberArrival(
  serverId: string,
  channelParam: string | undefined,
) {
  const home = homeStore.getState();
  let server: ServerResponse | null = null;
  const channels = home.channels[serverId];
  if (channels) server = { id: serverId, channels } as ServerResponse;
  else {
    try {
      server = await serverRepository.getServer(serverId);
      setServerDetail(server);
    } catch {
      return null;
    }
  }
  const to = memberDestination(server, channelParam, home.open);
  if (to) arrive(server, to);
  return to && { server, to };
}

// S-MOD-01 "Tham gia" → `joining` → the server, or `expired` / `banned` / `max-servers`.
// A second tap while joining is ignored (Chỉ ghi luật: hai lần thật nhanh).
export function useJoinInvite(
  code: string,
  channelParam: string | undefined,
  onJoined: (server: ServerResponse, to: Destination | null) => void,
) {
  const [error, setError] = useState<JoinError | null>(null);
  const mutation = useGuardedMutation(() => joinInvite(inviteRepository, code));
  const join = async (preview: InvitePreview) => {
    setError(null);
    const result = await mutation.run();
    if (!result) return;
    if (!result.ok) return setError(result.error);
    addServer(result.server);
    const to = joinDestination(result.server, preview, channelParam);
    if (to) arrive(result.server, to);
    onJoined(result.server, to);
  };
  return { join, joining: mutation.pending, error };
}
