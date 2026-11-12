import { DEFAULT_USER_SETTINGS, ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { changeTimezone, lockedNote, timezoneLock } from './timezone';

// Spec 07: now 20:12 GMT+7 on 18/10/2026.
const NOW = new Date('2026-10-18T13:12:00Z');

describe('lockedNote (S-ME-06 `timezone-rate-limited`)', () => {
  it("says when in the account's new zone, with its GMT code", () => {
    expect(lockedNote(new Date('2026-10-19T13:12:00Z'), 'Asia/Tokyo')).toEqual({
      time: '22:12',
      date: '19/10',
      zone: 'GMT+9',
    });
  });
});

describe('timezoneLock', () => {
  it('changed in Cài đặt 2 hours ago → locked for 22 more hours', () => {
    expect(
      timezoneLock(
        {
          ...DEFAULT_USER_SETTINGS,
          timezone_changed_at: '2026-10-18T11:12:00.000Z',
        },
        null,
        NOW,
      ),
    ).toEqual(new Date('2026-10-19T11:12:00Z'));
  });

  it('a 40029 seen here (changed on another device) locks even before the update arrives', () => {
    const until = new Date('2026-10-19T09:00:00Z');
    expect(timezoneLock(DEFAULT_USER_SETTINGS, until, NOW)).toEqual(until);
  });

  it('never changed, or the lock passed → free', () => {
    expect(timezoneLock(DEFAULT_USER_SETTINGS, null, NOW)).toBeNull();
    expect(
      timezoneLock(
        DEFAULT_USER_SETTINGS,
        new Date('2026-10-18T13:00:00Z'),
        NOW,
      ),
    ).toBeNull();
  });
});

describe('changeTimezone', () => {
  it('saved → the new settings', async () => {
    const r = await changeTimezone(
      {
        update: async (c) => ({ ...DEFAULT_USER_SETTINGS, ...c }),
      },
      'Asia/Tokyo',
      NOW,
    );
    expect(r).toMatchObject({ ok: true, settings: { timezone: 'Asia/Tokyo' } });
  });

  it('STUDY-03 AC4: 40029 → locked until now + retry_after', async () => {
    const r = await changeTimezone(
      {
        update: () =>
          Promise.reject({ code: ErrorCode.RateLimited, retry_after: 3600 }),
      },
      'Asia/Tokyo',
      NOW,
    );
    expect(r).toEqual({
      ok: false,
      error: 'rate-limited',
      until: new Date('2026-10-18T14:12:00Z'),
    });
  });

  it('anything else → failed', async () => {
    const r = await changeTimezone(
      { update: () => Promise.reject(new Error('offline')) },
      'Asia/Tokyo',
      NOW,
    );
    expect(r).toEqual({ ok: false, error: 'failed' });
  });
});
