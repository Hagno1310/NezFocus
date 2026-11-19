import type { MessageResponse } from '@nezfocus/shared';

// SRS 7.5.1 "emit MESSAGE_CREATED (event-emitter)": in-process, after the message is saved.
// Mention / read state (P2-A4) and DM reopen (P2-B3.2) listen here with @OnEvent instead of
// editing MessagesService.
export const MESSAGE_CREATED = 'message.created';

export type MessageCreated = {
  message: MessageResponse;
  serverId: bigint | null; // null in a DM
};
