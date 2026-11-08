import type { UpdateServerRequest } from '@nezfocus/shared';
import { serverRepository } from '../../../data/servers';
import { applyGatewayEvent } from '../../../domain/servers/homeStore';
import { saveServer } from '../../../domain/servers/updateServer';

// S-SET-01 overview: save, then show the answer in the drawer before SERVER_UPDATE comes.
export function useSaveServer(serverId: string) {
  return async (body: UpdateServerRequest) => {
    const result = await saveServer(serverRepository, serverId, body);
    if (result.ok)
      applyGatewayEvent({ t: 'SERVER_UPDATE', d: result.server, s: 0 });
    return result;
  };
}
