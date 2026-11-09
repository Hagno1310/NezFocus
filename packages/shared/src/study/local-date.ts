// Calendar arithmetic on local dates (YYYY-MM-DD), free of any time zone.
const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (d: string, n: number) => toDate(toMs(d) + n * DAY_MS);

export const daysBetween = (from: string, to: string) =>
  Math.round((toMs(to) - toMs(from)) / DAY_MS);

// REQ-STUDY-17: a week runs Monday–Sunday; a month is the calendar month.
export const periodOf = (view: 'week' | 'month', d: string) => {
  if (view === 'week') {
    const from = addDays(d, -((new Date(toMs(d)).getUTCDay() + 6) % 7));
    return { from, to: addDays(from, 6) };
  }
  const [y, m] = d.split('-').map(Number);
  const from = `${d.slice(0, 7)}-01`;
  return { from, to: toDate(Date.UTC(y!, m!, 0)) };
};

// REQ-STUDY-17: the previous period; a running one compares only its first days so far.
export const previousPeriod = (
  view: 'week' | 'month',
  p: { from: string; to: string },
  today: string,
) => {
  const prev = periodOf(view, addDays(p.from, -1));
  if (today > p.to || today < p.from) return prev;
  const end = addDays(prev.from, daysBetween(p.from, today));
  return { from: prev.from, to: end < prev.to ? end : prev.to };
};
