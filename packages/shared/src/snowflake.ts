import { z } from 'zod';

// SRS 1.3: Snowflake IDs are 64-bit and always travel as strings in JSON.
// One check: zod v4 still runs refine() after regex() fails, and BigInt('12a') throws.
export const SnowflakeId = z
  .string()
  .refine(
    (s) => /^\d{1,20}$/.test(s) && BigInt(s) < 2n ** 64n,
    'invalid snowflake id',
  );

export type SnowflakeId = z.infer<typeof SnowflakeId>;
