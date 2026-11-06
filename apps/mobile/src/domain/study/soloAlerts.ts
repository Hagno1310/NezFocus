import { nextBreak, type SoloSnapshot } from './solo';

// S-ROOM-07 notifications of a Solo Session.
export type SoloAlert =
  | { at: Date; kind: 'to-break' | 'to-long-break'; minutes: number }
  | { at: Date; kind: 'solo-waiting' };

const MINUTE = 60_000;

// SRS 7.3.6 step 2: Solo schedules up to the end of the current break only; the next focus waits
// for "Học tiếp" by the user. `localNow` and the result are phone times.
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
