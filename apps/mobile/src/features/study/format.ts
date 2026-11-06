import type { CycleConfig } from '@nezfocus/shared';
import type { TFunction } from 'i18next';

const pad = (n: number) => String(n).padStart(2, '0');

// Clock time on the phone, as the status bar shows it.
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const cycleText = (c: CycleConfig) =>
  `${c.focus_min}/${c.short_break_min}`;

export const durationText = (t: TFunction, minutes: number) => {
  const hours = Math.floor(minutes / 60);
  return hours
    ? t('study.duration', { hours, minutes: minutes % 60 })
    : t('study.durationMinutes', { minutes });
};
