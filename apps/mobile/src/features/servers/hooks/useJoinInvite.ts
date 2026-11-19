import type { InvitePreview, ServerResponse } from '@nezfocus/shared';
import { useState } from 'react';
import { inviteRepository } from '../../../data/invites';
import {
  arrive,
  joinDestination,
  joinInvite,
  type Destination,
  type JoinError,
} from '../../../domain/invites/joinInvite';
import { addServer } from '../../../domain/servers/homeStore';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';

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
    if (to) arrive(result.server.id, to);
    onJoined(result.server, to);
  };
  return { join, joining: mutation.pending, error };
}
