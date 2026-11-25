import type { DmChannel } from '@nezfocus/shared';

// SRS 5.3 DM. Errors are ApiError with the SRS 11.1 code (40303, 40401).
export interface DmRepository {
  open(recipientId: string): Promise<DmChannel>;
  close(channelId: string): Promise<void>;
}

// The cache behind DmState (SRS 8.7).
export interface LocalDms {
  all(): Promise<DmChannel[]>;
  replace(list: readonly DmChannel[]): Promise<void>;
}
