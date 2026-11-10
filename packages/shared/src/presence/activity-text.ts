import type { FocusPhase } from '../study/solo.contract.js';
import type { StudyActivity } from './presence.contract.js';

// C-40: "còn N phút" never shrinks; the phase, "Một mình" and the room name cut "…" first.
export type ActivitySegment = { text: string; shrink: boolean };
export type ActivityForm = 'short' | 'full';

const PHASE: Record<FocusPhase, string> = {
  focus: 'Tập trung',
  short_break: 'Nghỉ ngắn',
  long_break: 'Nghỉ dài',
};

// Whole minutes, like the timer rows (C-16); under one minute "còn dưới 1 phút" (C-40).
const left = (endsAt: string | null, now: Date) => {
  const minutes = Math.floor(
    (Date.parse(endsAt ?? '') - now.getTime()) / 60_000,
  );
  return minutes >= 1 ? `còn ${minutes} phút` : 'còn dưới 1 phút';
};

const cut = (text: string): ActivitySegment => ({ text, shrink: true });
const keep = (text: string): ActivitySegment => ({ text, shrink: false });

// REQ-AUTH-05 dạng đủ / dạng ngắn, as segments joined by " · ".
export function activityText(
  a: StudyActivity,
  form: ActivityForm,
  now: Date,
): ActivitySegment[] {
  const full = form === 'full';
  switch (a.kind) {
    case 'solo': {
      const lead = full ? 'Đang học một mình · ' : '';
      if (a.state === 'paused') return [cut(`${lead}Tạm dừng`)];
      if (a.state === 'waiting')
        return [cut(full ? `${lead}Hết giờ nghỉ` : 'Một mình · hết giờ nghỉ')];
      return [
        cut(full ? `${lead}${PHASE[a.phase]}` : 'Một mình'),
        keep(left(a.phase_ends_at, now)),
      ];
    }
    case 'group_study': {
      const r = a.room;
      if (!r) return [cut('Đang học cùng nhóm')];
      const room = full ? [cut(r.channel_name)] : [];
      if (r.state === 'paused') return [cut('Tạm dừng'), ...room];
      return [cut(PHASE[r.phase]), keep(left(r.phase_ends_at, now)), ...room];
    }
    case 'voice':
      return [
        cut(
          a.room ? `Đang ở ${a.room.channel_name}` : 'Đang ở một phòng voice',
        ),
      ];
  }
}

// The whole sentence, e.g. for accessibilityLabel.
export const activityLine = (segments: ActivitySegment[]) =>
  segments.map((s) => s.text).join(' · ');
