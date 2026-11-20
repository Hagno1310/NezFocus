import { TypingRoutes } from '@nezfocus/shared';
import type { TypingRepository } from '../../domain/typing/TypingRepository';
import { api } from '../api';

export const remoteTypingRepository: TypingRepository = {
  start: async (channelId) => {
    await api.request(TypingRoutes.start.replace(':id', channelId), {
      method: 'POST',
    });
  },
};
