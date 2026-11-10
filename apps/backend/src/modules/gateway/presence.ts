import type {
  PresenceStatus,
  SoloSession,
  StudyActivity,
  VisibleStatus,
} from '@nezfocus/shared';

// REQ-AUTH-05 / DEC-34: background with a live socket (voice, Room Session) turns Idle after 5 min.
export const BACKGROUND_IDLE_MS = 5 * 60_000;
// AUTH-05 AC3: a device not heard from for 50 s is gone. The client sends a heartbeat every 41.25 s
// (SRS 5.4), and the 10 s sweep keeps the whole delay under 60 s.
export const LIVE_WINDOW_MS = 50_000;
export const SWEEP_MS = 10_000;

export type Device = {
  connected: boolean;
  lastSeenAt: number;
  foreground: boolean;
  afk: boolean; // op 3 afk: no touch for 10 min on this device
  backgroundSince: number | null;
};

const isLive = (d: Device, now: number) =>
  d.connected && now - d.lastSeenAt <= LIVE_WINDOW_MS;

const isActive = (d: Device, now: number) =>
  d.foreground
    ? !d.afk
    : d.backgroundSince !== null &&
      now - d.backgroundSince < BACKGROUND_IDLE_MS;

// What everyone else sees. Online if at least one device is active (AUTH-05).
export function aggregate(
  preferred: PresenceStatus,
  devices: readonly Device[],
  now: number,
): VisibleStatus {
  const live = devices.filter((d) => isLive(d, now));
  if (!live.length || preferred === 'invisible') return 'offline';
  if (preferred !== 'online') return preferred;
  return live.some((d) => isActive(d, now)) ? 'online' : 'idle';
}

export function soloActivity(s: SoloSession | null): StudyActivity | null {
  if (!s || s.status === 'ended') return null;
  return {
    kind: 'solo',
    phase: s.phase,
    state: s.status,
    phase_ends_at: s.status === 'running' ? s.phase_ends_at : null,
  };
}

// AUTH-05 AC5: nobody sees it when the user is Invisible (seen as offline) or turned it off.
// ponytail: blocks (user_blocks) and per-receiver VIEW_CHANNEL come with P2-B2 (#19) and P3-B3.3 (#147).
export function visibleActivity(
  activity: StudyActivity | null,
  user: { status: VisibleStatus; showActivity: boolean },
): StudyActivity | null {
  if (user.status === 'offline' || !user.showActivity) return null;
  return activity;
}
