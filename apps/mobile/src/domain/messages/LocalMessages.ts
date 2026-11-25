import type { MessageResponse } from '@nezfocus/shared';
import type { OutboxEntry } from './outbox';

// The device's copy of messages and the outbox (SRS 7.3.2, 8.7). Survives app restarts,
// wiped at sign-out (AUTH-07).
export interface LocalMessages {
  messages(channelId: string): Promise<MessageResponse[]>; // oldest first
  saveMessages(messages: MessageResponse[]): Promise<void>; // insert or replace by id
  // Only channels opened at least once keep messages (7.3.2).
  isCached(channelId: string): Promise<boolean>;
  touchChannel(
    channelId: string,
    serverId: string | null,
    now: number,
  ): Promise<void>;
  // S-HOME-10 › SERVER CHUNG: "mở server đó ở kênh mở gần nhất" (AUTH-06 v1.9).
  lastOpened(serverId: string): Promise<string | null>;
  // Keep the newest `keep` of each channel but `open`, and only the `maxChannels` most recent.
  prune(keep: number, maxChannels: number, open?: string): Promise<void>;

  outbox(): Promise<OutboxEntry[]>; // oldest first
  addOutbox(entry: OutboxEntry): Promise<void>;
  updateOutbox(nonce: string, patch: Partial<OutboxEntry>): Promise<void>;
  removeOutbox(nonce: string): Promise<void>;
  // Kicked or banned (7.3.2): that server's messages and unsent ones go.
  dropServer(serverId: string): Promise<void>;
}
