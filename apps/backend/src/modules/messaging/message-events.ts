import type { MessageResponse } from '@nezfocus/shared';
import type { MentionVia } from './mentions.js';

// SRS 7.5.1 "emit MESSAGE_CREATED (event-emitter)": in-process, after the message is saved.
// Mention / read state (P2-A4) and DM reopen (P2-B3.2) listen here with @OnEvent instead of
// editing MessagesService.
export const MESSAGE_CREATED = 'message.created';

export type MessageCreated = {
  message: MessageResponse;
  serverId: bigint | null; // null in a DM
  // CR-12: who the message concerns, one way each (empty in a DM and for system messages).
  concerned: ReadonlyMap<string, MentionVia>;
};

// REQ-NOTIF-05 AC5 (P4-B1 #36): I read up to messageId in channelId (an ack, or my own message).
// The inbox marks its mention items read here; nothing here calls the inbox back (CR-21).
export const CHANNEL_READ = 'channel.read';

export type ChannelRead = {
  userId: bigint;
  channelId: bigint;
  messageId: bigint;
};
