import type {
  CreateMessageRequest,
  MessageAuthor,
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
  // REQ-NOTIF-01: read up to messageId; MESSAGE_ACK comes back to every session.
  ack(channelId: string, messageId: string): Promise<void>;
  // REQ-MSG-05
  edit(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<MessageResponse>;
  remove(channelId: string, messageId: string): Promise<void>;
  react(channelId: string, messageId: string, emoji: string): Promise<void>;
  unreact(channelId: string, messageId: string, emoji: string): Promise<void>;
  // REQ-MSG-10: newest pin first; PUT / DELETE answer 204.
  pins(channelId: string): Promise<MessageResponse[]>;
  pin(channelId: string, messageId: string): Promise<void>;
  unpin(channelId: string, messageId: string): Promise<void>;
  // CR-28 #26: "Ai đã thả cảm xúc", oldest first.
  reactionUsers(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageAuthor[]>;
}
