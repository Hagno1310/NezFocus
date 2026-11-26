import { messageStore } from '../../../data/messages';
import type { UploadRef } from '../../../domain/attachments/uploads';

// REQ-MSG-09: every send goes through the outbox, online or not (NFR-MOB-09).
// S-HOME-04 `failed-message`: retry = "Gửi lại", discard = "Xóa tin nhắn".
export function useSendMessage(channelId: string) {
  return {
    send: (content: string, replyToId?: string, attachments?: UploadRef[]) =>
      messageStore.send(channelId, content, replyToId, attachments),
    // S-HOME-04 `failed-file-blocked`.
    sendWithoutBlocked: (nonce: string) =>
      messageStore.sendWithoutBlocked(nonce),
    retry: (nonce: string) => messageStore.retry(nonce),
    discard: (nonce: string) => messageStore.discard(nonce),
  };
}
