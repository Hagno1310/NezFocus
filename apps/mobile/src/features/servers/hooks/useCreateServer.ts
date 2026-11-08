import type { ServerTemplate } from '@nezfocus/shared';
import { useState } from 'react';
import { serverRepository } from '../../../data/servers';
import {
  createServer,
  type CreateServerError,
} from '../../../domain/servers/createServer';
import { openChannel } from '../../../domain/servers/homeStore';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';

// S-HOME-06 name-server → creating → created / create-error. A second tap while creating is
// ignored, so "Tạo server" twice never makes two servers.
export function useCreateServer(onCreated: () => void) {
  const [error, setError] = useState<CreateServerError | null>(null);
  const mutation = useGuardedMutation(
    (template: ServerTemplate, name: string) =>
      createServer(serverRepository, template, name),
  );
  const submit = async (template: ServerTemplate, name: string) => {
    setError(null);
    const result = await mutation.run(template, name);
    if (!result) return;
    if (!result.ok) return setError(result.error);
    const { server, channelId } = result;
    const channel = server.channels.find((c) => c.id === channelId);
    if (channel)
      openChannel({
        serverId: server.id,
        serverName: server.name,
        channelId: channel.id,
        channelName: channel.name,
      });
    onCreated();
  };
  return {
    submit,
    pending: mutation.pending,
    error,
    clearError: () => setError(null),
  };
}
