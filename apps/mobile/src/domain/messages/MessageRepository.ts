import type {
  CreateMessageRequest,
  MessageHistoryQuery,
  MessageResponse,
} from '@nezfocus/shared';

// SRS 5.3 Message over the network. Remote or Fake (EXPO_PUBLIC_FAKE=messages).
export interface MessageRepository {
  history(
    channelId: string,
    query: Partial<MessageHistoryQuery>,
  ): Promise<MessageResponse[]>; // oldest first
  send(channelId: string, body: CreateMessageRequest): Promise<MessageResponse>;
}
