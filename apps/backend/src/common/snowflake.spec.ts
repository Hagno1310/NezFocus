import { SnowflakeGenerator } from './snowflake.js';

describe('SnowflakeGenerator', () => {
  it('is strictly increasing within and across milliseconds, even when the clock goes back', () => {
    const times = [1767225600001, 1767225600001, 1767225600000, 1767225600005];
    const gen = new SnowflakeGenerator(7, () => times.shift()!);
    const ids = [gen.next(), gen.next(), gen.next(), gen.next()];
    for (let i = 1; i < ids.length; i++) expect(ids[i] > ids[i - 1]).toBe(true);
    expect((ids[0] >> 12n) & 0x3ffn).toBe(7n);
  });

  it('rolls into the next millisecond after 4096 ids', () => {
    const gen = new SnowflakeGenerator(0, () => 1767225600000);
    const seen = new Set<bigint>();
    for (let i = 0; i < 5000; i++) seen.add(gen.next());
    expect(seen.size).toBe(5000);
  });
});
