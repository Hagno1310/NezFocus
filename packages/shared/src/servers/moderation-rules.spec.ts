import { BanRequest } from './ban.contract.js';
import { KickMemberRequest, UpdateMemberRequest } from './member.contract.js';
import { isTimedOut, TIMEOUT_LEVELS } from './moderation-rules.js';

describe('moderation requests (REQ-ROLE-05)', () => {
  it('a blank reason is no reason; 513 characters are refused', () => {
    expect(KickMemberRequest.parse({ reason: '   ' }).reason).toBeNull();
    expect(KickMemberRequest.parse({}).reason).toBeUndefined();
    expect(
      KickMemberRequest.safeParse({ reason: 'x'.repeat(513) }).success,
    ).toBe(false);
    expect(KickMemberRequest.parse({ reason: ' spam ' }).reason).toBe('spam');
  });

  it('ban deletes nothing unless asked, and only 0 / 1 / 7 days', () => {
    expect(BanRequest.parse({}).delete_message_days).toBe(0);
    expect(
      BanRequest.parse({ delete_message_days: 7 }).delete_message_days,
    ).toBe(7);
    expect(BanRequest.safeParse({ delete_message_days: 3 }).success).toBe(
      false,
    );
  });

  it('lifting a timeout is timeout_until null', () => {
    expect(UpdateMemberRequest.parse({ timeout_until: null })).toEqual({
      timeout_until: null,
    });
  });

  it('six levels from 60 seconds to a week; timed out only before the end', () => {
    expect(TIMEOUT_LEVELS.map((l) => l.key)).toEqual([
      '60s',
      '5m',
      '10m',
      '1h',
      '1d',
      '1w',
    ]);
    const now = Date.parse('2026-10-18T13:12:00Z');
    expect(isTimedOut('2026-10-18T14:12:00Z', now)).toBe(true);
    expect(isTimedOut('2026-10-18T13:12:00Z', now)).toBe(false);
    expect(isTimedOut(null, now)).toBe(false);
  });
});
