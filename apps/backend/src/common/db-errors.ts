// Postgres unique_violation, unwrapped from drizzle's DrizzleQueryError when present.
export const isUniqueViolation = (err: unknown, constraint?: string) => {
  const pg = (
    err && typeof err === 'object' && 'cause' in err && err.cause
      ? err.cause
      : err
  ) as { code?: string; constraint?: string } | null;
  return (
    pg?.code === '23505' &&
    (constraint === undefined || pg.constraint === constraint)
  );
};
