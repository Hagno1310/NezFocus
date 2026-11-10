// REQ-STUDY-15 (4): at most 16 hours of focus per local day.
export const DAILY_FOCUS_CAP_SECONDS = 16 * 60 * 60;

// REQ-STUDY-15 (1): seconds are stored; minutes only appear, rounded down, for display and thresholds.
export const toFocusedMinutes = (seconds: number) => Math.floor(seconds / 60);

// DEC-43: a Qualified Day has at least 15 focused minutes (REQ-STUDY-03).
export const QUALIFIED_DAY_MINUTES = 15;
