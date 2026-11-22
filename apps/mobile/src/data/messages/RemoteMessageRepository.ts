import {
  MessageListResponse,
  MessageResponse,
  MessageRoutes,
} from '@nezfocus/shared';
import type { MessageRepository } from '../../domain/messages/MessageRepository';
import { api } from '../api';

const path = (channelId: string) =>
  MessageRoutes.list.replace(':id', channelId);

export const remoteMessageRepository: MessageRepository = {
  async history(channelId, query) {
    const params = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    );
    return MessageListResponse.parse(
      await api.request(`${path(channelId)}?${params}`),
    );
  },
  send: async (channelId, body) =>
    MessageResponse.parse(
      await api.request(path(channelId), { method: 'POST', body }),
    ),
  async ack(channelId, messageId) {
    await api.request(
      MessageRoutes.ack
        .replace(':id', channelId)
        .replace(':messageId', messageId),
      { method: 'POST' },
    );
  },
};
