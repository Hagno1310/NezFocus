import { nextBreak, type SoloSnapshot } from './solo';

// S-ROOM-07 notifications of a Solo Session.
export type SoloAlert =
  | { at: Date; kind: 'to-break' | 'to-long-break'; minutes: number }
  | { at: Date; kind: 'solo-waiting' };

const MINUTE = 60_000;

// SRS 7.3.6 step 2: only up to the end of the current break; the next focus waits for "Học tiếp".
export function soloAlerts(snap: SoloSnapshot, localNow: Date): SoloAlert[] {
  const s = snap.session;
  if (s.status !== 'running') return [];
  const local = (backendMs: number) => new Date(backendMs - snap.offsetMs);
  const end = Date.parse(s.phase_ends_at!);
  const alerts: SoloAlert[] = [];
  if (s.phase === 'focus') {
    // The machine switches to the pending config when the break starts.
    const c = s.next_cycle_config ?? s.cycle_config;
    const long = nextBreak(s) === 'long_break';
    const minutes = long ? c.long_break_min! : c.short_break_min;
    alerts.push(
      { at: local(end), kind: long ? 'to-long-break' : 'to-break', minutes },
      { at: local(end + minutes * MINUTE), kind: 'solo-waiting' },
    );
  } else {
    alerts.push({ at: local(end), kind: 'solo-waiting' });
  }
  return alerts.filter((a) => a.at > localNow);
}

// A press moves the phase early; only the clock running out lands this close to the end.
const RAN_OUT_SLACK_MS = 2000;
// Back in the app long after the end: the notification already told, no late sound.
const RAN_OUT_LATE_MS = 30_000;

// SRS 3.3 / STUDY-10: the update that `next` brings is the phase running out (focus → break,
// break → waiting for "Học tiếp"), not "Bỏ qua pha", "Tạm dừng" or "Dừng". backendNow: the
// backend clock when it arrived.
export function phaseRanOut(
  prev: SoloSnapshot['session'],
  next: SoloSnapshot['session'],
  backendNow: number,
): boolean {
  if (prev.id !== next.id || prev.status !== 'running' || !prev.phase_ends_at)
    return false;
  const moved =
    (next.status === 'running' && next.phase !== prev.phase) ||
    next.status === 'waiting';
  const end = Date.parse(prev.phase_ends_at);
  return (
    moved &&
    backendNow >= end - RAN_OUT_SLACK_MS &&
    backendNow <= end + RAN_OUT_LATE_MS
  );
}
