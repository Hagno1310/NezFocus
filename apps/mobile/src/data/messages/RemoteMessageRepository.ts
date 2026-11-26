import {
  MessageListResponse,
  MessageResponse,
  MessageRoutes,
  ReactionUsersResponse,
} from '@nezfocus/shared';
import type { MessageRepository } from '../../domain/messages/MessageRepository';
import { api } from '../api';

const path = (channelId: string) =>
  MessageRoutes.list.replace(':id', channelId);
const messagePath = (channelId: string, messageId: string) =>
  MessageRoutes.message
    .replace(':id', channelId)
    .replace(':messageId', messageId);
const pinPath = (channelId: string, messageId: string) =>
  MessageRoutes.pin.replace(':id', channelId).replace(':messageId', messageId);
const reaction = (
  route: string,
  channelId: string,
  messageId: string,
  emoji: string,
) =>
  route
    .replace(':id', channelId)
    .replace(':messageId', messageId)
    .replace(':emoji', encodeURIComponent(emoji));

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
  edit: async (channelId, messageId, content) =>
    MessageResponse.parse(
      await api.request(messagePath(channelId, messageId), {
        method: 'PATCH',
        body: { content },
      }),
    ),
  async remove(channelId, messageId) {
    await api.request(messagePath(channelId, messageId), { method: 'DELETE' });
  },
  async react(channelId, messageId, emoji) {
    await api.request(
      reaction(MessageRoutes.myReaction, channelId, messageId, emoji),
      { method: 'PUT' },
    );
  },
  async unreact(channelId, messageId, emoji) {
    await api.request(
      reaction(MessageRoutes.myReaction, channelId, messageId, emoji),
      { method: 'DELETE' },
    );
  },
  pins: async (channelId) =>
    MessageListResponse.parse(
      await api.request(MessageRoutes.pins.replace(':id', channelId)),
    ),
  async pin(channelId, messageId) {
    await api.request(pinPath(channelId, messageId), { method: 'PUT' });
  },
  async unpin(channelId, messageId) {
    await api.request(pinPath(channelId, messageId), { method: 'DELETE' });
  },
  reactionUsers: async (channelId, messageId, emoji) =>
    ReactionUsersResponse.parse(
      await api.request(
        reaction(MessageRoutes.reaction, channelId, messageId, emoji),
      ),
    ),
};
