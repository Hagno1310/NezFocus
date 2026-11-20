// REQ-MSG-06: POST /channels/{id}/typing (DEC-33).
export interface TypingRepository {
  start(channelId: string): Promise<void>;
}
