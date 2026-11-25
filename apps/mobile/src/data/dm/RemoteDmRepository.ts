import { DmChannel, DmRoutes } from '@nezfocus/shared';
import type { DmRepository } from '../../domain/dm/DmRepository';
import { api } from '../api';

export const remoteDmRepository: DmRepository = {
  open: async (recipientId) =>
    DmChannel.parse(
      await api.request(DmRoutes.create, {
        method: 'POST',
        body: { recipient_id: recipientId },
      }),
    ),
  async close(channelId) {
    await api.request(DmRoutes.close.replace(':id', channelId), {
      method: 'DELETE',
    });
  },
};
