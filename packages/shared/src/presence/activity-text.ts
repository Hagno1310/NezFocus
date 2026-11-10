import type { FocusPhase } from '../study/solo.contract.js';
import type { StudyActivity } from './presence.contract.js';

// C-40: one place for the words, icon and cut rule of a study activity (REQ-AUTH-05 CR-24/25).
// Segments join with " · "; only "còn N phút" has shrink false, it is never cut (C-40 › Cắt).
export type ActivitySegment = { text: string; shrink: boolean };
export type ActivityForm = 'short' | 'full';

const PHASE: Record<FocusPhase, string> = {
  focus: 'Tập trung',
  short_break: 'Nghỉ ngắn',
  long_break: 'Nghỉ dài',
};

const cut = (text: string): ActivitySegment => ({ text, shrink: true });
const keep = (text: string): ActivitySegment => ({ text, shrink: false });

// Whole minutes like the timer rows (C-16), so under one minute reads "còn dưới 1 phút" (C-40).
// A running phase without an end shows no time rather than a wrong one.
const timeLeft = (endsAt: string | null, now: Date): ActivitySegment[] => {
  if (!endsAt) return [];
  const minutes = Math.floor((Date.parse(endsAt) - now.getTime()) / 60_000);
  return [keep(minutes >= 1 ? `còn ${minutes} phút` : 'còn dưới 1 phút')];
};

// "Tập trung · còn 12 phút" / "Tạm dừng" / "Hết giờ nghỉ": line 1 of `block`, the phase part of the rest.
function phaseSegments(a: StudyActivity, now: Date): ActivitySegment[] {
  if (a.kind === 'voice') return [];
  const p = a.kind === 'solo' ? a : a.room;
  if (!p) return [];
  if (p.state === 'paused') return [cut('Tạm dừng')];
  if (p.state === 'waiting') return [cut('Hết giờ nghỉ')];
  return [cut(PHASE[p.phase]), ...timeLeft(p.phase_ends_at, now)];
}

export function activityText(
  activity: StudyActivity,
  form: ActivityForm,
  now: Date,
): ActivitySegment[] {
  const full = form === 'full';
  switch (activity.kind) {
    case 'solo': {
      if (full)
        return [cut('Đang học một mình'), ...phaseSegments(activity, now)];
      if (activity.state === 'paused') return [cut('Tạm dừng')];
      if (activity.state === 'waiting') return [cut('Một mình · hết giờ nghỉ')];
      return [cut('Một mình'), ...timeLeft(activity.phase_ends_at, now)];
    }
    case 'group_study': {
      const room = activity.room;
      if (!room) return [cut('Đang học cùng nhóm')];
      const phase = phaseSegments(activity, now);
      return full ? [...phase, cut(room.channel_name)] : phase;
    }
    case 'voice':
      return [
        cut(
          activity.room
            ? `Đang ở ${activity.room.channel_name}`
            : 'Đang ở một phòng voice',
        ),
      ];
  }
}

// C-40 › block (S-HOME-10): line 1 the phase and time, line 2 where; a room not seen has one line.
export function activityBlock(
  activity: StudyActivity,
  now: Date,
): { title: ActivitySegment[]; subtitle: string | null } {
  if (activity.kind === 'solo')
    return {
      title: phaseSegments(activity, now),
      subtitle: 'Đang học một mình',
    };
  if (activity.kind === 'group_study' && activity.room)
    return {
      title: phaseSegments(activity, now),
      subtitle: activity.room.channel_name,
    };
  return { title: activityText(activity, 'short', now), subtitle: null };
}

// C-40 › Icon 14: a phase icon in its phase colour while running, otherwise pause / coffee / channel icon.
export type ActivityIcon =
  FocusPhase | 'paused' | 'waiting' | 'study_room' | 'voice';

export function activityIcon(activity: StudyActivity): ActivityIcon {
  if (activity.kind === 'voice')
    return activity.room?.study_room ? 'study_room' : 'voice';
  const p = activity.kind === 'solo' ? activity : activity.room;
  if (!p) return 'study_room';
  if (p.state === 'running') return p.phase;
  return p.state;
}

export const activityLine = (segments: ActivitySegment[]) =>
  segments.map((s) => s.text).join(' · ');
