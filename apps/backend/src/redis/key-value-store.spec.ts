import { MemoryKeyValueStore } from './key-value-store.js';

// REQ-MSG-08: the sliding-window log the message rate limit runs on.
describe('MemoryKeyValueStore.hitWindows', () => {
  let now = 0;
  const kv = new MemoryKeyValueStore({ now: () => new Date(now) });
  const perChannel = { key: 'c', limit: 5, windowMs: 5_000 };
  const perUser = { key: 'u', limit: 30, windowMs: 60_000 };

  beforeEach(() => {
    now = 1_000_000;
  });

  it('lets 5 through, refuses the 6th with the wait until the oldest leaves', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await kv.hitWindows([perChannel])).toBe(0);
      now += 500;
    }
    expect(await kv.hitWindows([perChannel])).toBe(5_000 - 2_500);
  });

  it('a refused hit is not counted', async () => {
    for (let i = 0; i < 5; i++)
      await kv.hitWindows([{ ...perChannel, key: 'r' }]);
    await kv.hitWindows([{ ...perChannel, key: 'r' }]);
    now += 5_000;
    // The window is empty again: 5 more pass although 6 were tried.
    for (let i = 0; i < 5; i++)
      expect(await kv.hitWindows([{ ...perChannel, key: 'r' }])).toBe(0);
  });

  it('every window must pass; a refusal records nothing in any of them', async () => {
    const full = { key: 'full', limit: 1, windowMs: 1_000 };
    await kv.hitWindows([full]);
    expect(await kv.hitWindows([{ ...perUser, key: 'u2' }, full])).toBe(1_000);
    // u2 got no hit from the refused call.
    for (let i = 0; i < 30; i++)
      expect(await kv.hitWindows([{ ...perUser, key: 'u2' }])).toBe(0);
    expect(await kv.hitWindows([{ ...perUser, key: 'u2' }])).toBeGreaterThan(0);
  });
});
