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
// LiveKit notices a killed app only after its departure timeout (~20 s): until then my old seat
// is not `away` yet. Still not away after this long = another login sits there.
export const AWAY_WAIT_MS = 30_000;

export type RejoinStep = 'rejoin' | 'wait' | 'no';

// VC-01 AC6: opened again within 3 minutes and my seat waits (`away`) in that room → rejoin.
// Not away yet → wait for it; it never goes away = another login (one voice per account).
export function rejoinStep(
  saved: SavedRoom | null,
  now: number,
  seats: VoiceSeats,
  me: string | null,
): RejoinStep {
  if (!saved || !me || now - saved.aliveAt > REJOIN_WITHIN_MS) return 'no';
  const seat = seats[me];
  if (seat?.channel_id !== saved.channelId) return 'no';
  return seat.away ? 'rejoin' : 'wait';
}
