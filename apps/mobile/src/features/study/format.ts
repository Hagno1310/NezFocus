import type { CycleConfig, RoomTimer } from '@nezfocus/shared';
import type { TFunction } from 'i18next';

const pad = (n: number) => String(n).padStart(2, '0');

// Clock time on the phone, as the status bar shows it.
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const cycleText = (c: CycleConfig) =>
  `${c.focus_min}/${c.short_break_min}`;

// REQ-STUDY-17 text rules ("45 phút", "1 giờ", "4 giờ 35 phút"), as shared formatMinutes but translated.
export const minutesText = (t: TFunction, minutes: number) => {
  const hours = Math.floor(minutes / 60);
  if (!hours) return t('study.durationMinutes', { minutes });
  return minutes % 60
    ? t('study.duration', { hours, minutes: minutes % 60 })
    : t('study.durationHours', { hours });
};

// "Từ trước tới nay": from 10 hours on, whole hours only.
export const allTimeText = (t: TFunction, minutes: number) =>
  minutes >= 600
    ? t('study.durationHours', { hours: Math.floor(minutes / 60) })
    : minutesText(t, minutes);

// History rows: 1–59 seconds read "dưới 1 phút".
export const sessionSecondsText = (t: TFunction, seconds: number) =>
  seconds > 0 && seconds < 60
    ? t('study.underMinute')
    : minutesText(t, Math.floor(seconds / 60));

export const weekdays = (t: TFunction) => t('study.weekdays').split(' ');
export const weekdaysLong = (t: TFunction) =>
  t('study.weekdaysLong').split('|');

// C-16 `list` for a room (C-05 `focus-running`, S-STUDY-01): minutes only, no seconds.
export function roomListLabel(t: TFunction, timer: RoomTimer) {
  if (timer.status === 'paused') return t('study.phase.pausedShort');
  const minutes = Math.floor(timer.remainingMs / 60_000);
  const phase = t(`study.phase.${timer.phase}`);
  return minutes
    ? t('study.home.left', { phase, minutes })
    : t('study.home.leftUnder', { phase });
}
