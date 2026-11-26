import type { VoiceTarget } from './voiceSession';
import type { VoiceSeats } from './voiceRooms';

// REQ-VC-01 (CR-22) "Mất kết nối không phải rời phòng": the room this phone is in, kept on the
// phone; `aliveAt` moves while the app runs, so a killed app leaves the time it died.
export type SavedRoom = VoiceTarget & { aliveAt: number };

export interface SavedRoomStore {
  load(): Promise<SavedRoom | null>;
  save(room: SavedRoom): Promise<void>;
  clear(): Promise<void>;
}

export const REJOIN_WITHIN_MS = 3 * 60_000; // the backend keeps the seat `away` this long
export const ALIVE_EVERY_MS = 30_000;

// VC-01 AC6: opened again within 3 minutes and my seat still waits (`away`) in that room →
// rejoin. Not away = another login sits there (one voice per account): stay out.
export function rejoinTarget(
  saved: SavedRoom | null,
  now: number,
  seats: VoiceSeats,
  me: string | null,
): VoiceTarget | null {
  if (!saved || !me || now - saved.aliveAt > REJOIN_WITHIN_MS) return null;
  const seat = seats[me];
  if (seat?.channel_id !== saved.channelId || !seat.away) return null;
  return { serverId: saved.serverId, channelId: saved.channelId };
}
