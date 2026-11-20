import { messageStore } from '../../../data/messages';

// REQ-MSG-09: every send goes through the outbox, online or not (NFR-MOB-09).
// S-HOME-04 `failed-message`: retry = "Gửi lại", discard = "Xóa tin nhắn".
export function useSendMessage(channelId: string) {
  return {
    send: (content: string) => messageStore.send(channelId, content),
    retry: (nonce: string) => messageStore.retry(nonce),
    discard: (nonce: string) => messageStore.discard(nonce),
  };
}
