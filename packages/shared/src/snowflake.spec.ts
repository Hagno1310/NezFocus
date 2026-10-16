import { SnowflakeId } from './snowflake.js';

describe('SnowflakeId', () => {
  it('accepts 64-bit decimal strings', () => {
    expect(SnowflakeId.safeParse('18446744073709551615').success).toBe(true);
  });

  it('rejects numbers, overflow and non-digits', () => {
    expect(SnowflakeId.safeParse(123).success).toBe(false);
    expect(SnowflakeId.safeParse('18446744073709551616').success).toBe(false);
    expect(SnowflakeId.safeParse('12a').success).toBe(false);
  });
});
