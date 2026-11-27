import type { Locale } from '../auth/auth.contract.js';
import type { CycleConfig } from './solo.contract.js';

// REQ-STUDY-01: the two presets of every cycle sheet (S-ROOM-03, S-STUDY-01, S-SET-07).
export const CYCLE_PRESETS = {
  '25/5': { focus_min: 25, short_break_min: 5 },
  '50/10': { focus_min: 50, short_break_min: 10 },
} as const satisfies Record<string, CycleConfig>;

// REQ-STUDY-11: a Phòng học without its own default cycle (DB NULL) uses 25/5.
export const DEFAULT_CYCLE_CONFIG: CycleConfig = CYCLE_PRESETS['25/5'];

const CYCLE_TEXT = {
  vi: { none: 'không nghỉ dài', long: 'nghỉ dài {m} sau mỗi {n} vòng' },
  en: { none: 'no long break', long: 'long break {m} every {n} rounds' },
} satisfies Record<Locale, { none: string; long: string }>;

// Spec 08 › Quy ước chung: "25/5 · không nghỉ dài", "45/10 · nghỉ dài 20 sau mỗi 4 vòng".
export function formatCycle(c: CycleConfig, locale: Locale): string {
  const text = CYCLE_TEXT[locale];
  const tail =
    c.long_break_min === undefined || c.long_break_every === undefined
      ? text.none
      : text.long
          .replace('{m}', String(c.long_break_min))
          .replace('{n}', String(c.long_break_every));
  return `${c.focus_min}/${c.short_break_min} · ${tail}`;
}

// REQ-STUDY-11: what MANAGE_STUDY_ROOMS alone may change on a voice channel (AC8: no name).
export const STUDY_ROOM_FIELDS = ['focus_control', 'default_cycle_config'];

export const isStudyRoomSettingsOnly = (body: object) =>
  Object.keys(body).every((k) => STUDY_ROOM_FIELDS.includes(k));
