import type { SoloSession, SoloSessionResponse } from '@nezfocus/shared';
import type { SoloRecord } from './solo-session.repository.js';

const iso = (d: Date | null) => d?.toISOString() ?? null;

export const toSoloSessionJson = ({
  id,
  state: s,
  ...r
}: SoloRecord): SoloSession => ({
  id: id.toString(),
  status: s.status,
  phase: s.phase,
  cycle_config: s.config,
  next_cycle_config: s.nextConfig,
  focus_phases_done: s.focusPhasesDone,
  phase_ends_at: iso(s.phaseEndsAt),
  paused_remaining_ms: s.pausedRemainingMs,
  waiting_since: iso(s.waitingSince),
  started_at: r.startedAt.toISOString(),
  ended_at: iso(s.endedAt),
  end_reason: s.endReason,
  focused_seconds: r.focusedSeconds,
  days: Object.entries(r.creditedDays)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([local_date, focused_seconds]) => ({ local_date, focused_seconds })),
  hit_daily_cap: r.hitDailyCap,
});

export const toSoloResponse = ({
  record,
  now,
}: {
  record: SoloRecord;
  now: Date;
}): SoloSessionResponse => ({
  solo_session: toSoloSessionJson(record),
  backend_time: now.toISOString(),
});
