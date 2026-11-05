// Injected wherever time decides an outcome (code expiry, rate-limit windows) so tests can move it.
export class Clock {
  now(): Date {
    return new Date();
  }
}

export const fixedClock = (start = new Date('2026-11-05T13:00:00.000Z')) => {
  let ms = start.getTime();
  return {
    now: () => new Date(ms),
    advance: (seconds: number) => {
      ms += seconds * 1000;
    },
  };
};
