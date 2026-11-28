import type { ServerBan } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  BAN_SEARCH_FROM,
  banDetailLine,
  banRowLine,
  inviteExpiry,
  inviteUses,
} from './serverLists';

const NOW = Date.parse('2026-10-18T13:12:00Z'); // 20:12 in Hà Nội
const TZ = 'Asia/Ho_Chi_Minh';

describe('S-SET-04 `invites` rows', () => {
  it('"3/10 lượt"; unlimited → "5 lượt"', () => {
    expect(inviteUses({ uses: 3, max_uses: 10 })).toEqual({ uses: 3, max: 10 });
    expect(inviteUses({ uses: 5, max_uses: 0 })).toEqual({
      uses: 5,
      max: null,
    });
  });

  it('"hết hạn sau 23 giờ" / "6 ngày" / minutes under an hour / never', () => {
    const at = (ms: number) => new Date(NOW + ms).toISOString();
    expect(inviteExpiry(at(23.5 * 3600_000), NOW)).toEqual({
      unit: 'hour',
      n: 23,
    });
    expect(inviteExpiry(at(6.9 * 86_400_000), NOW)).toEqual({
      unit: 'day',
      n: 6,
    });
    expect(inviteExpiry(at(45 * 60_000), NOW)).toEqual({
      unit: 'minute',
      n: 45,
    });
    expect(inviteExpiry(at(20_000), NOW)).toEqual({ unit: 'minute', n: 1 });
    expect(inviteExpiry(null, NOW)).toBeNull();
  });
});

const vu: ServerBan = {
  user: { id: 'vu', username: 'vu.dang', display_name: 'Vũ', avatar: null },
  reason: 'Spam link cá cược',
  banned_by: { id: 'an', username: 'an.nguyen', display_name: 'An' },
  created_at: '2026-10-15T06:00:00Z',
};

describe('S-SET-04 `bans`', () => {
  it('row "Spam link cá cược · 15/10 · bởi An"; no reason, no banner', () => {
    expect(banRowLine(vu, TZ)).toEqual({
      reason: 'Spam link cá cược',
      date: '15/10',
      by: 'An',
    });
    expect(banRowLine({ ...vu, reason: null, banned_by: null }, TZ)).toEqual({
      reason: null,
      date: '15/10',
      by: null,
    });
  });

  it('`ban-detail` "Cấm ngày 15/10/2026 bởi An (an.nguyen)"', () => {
    expect(banDetailLine(vu, TZ)).toEqual({
      date: '15/10/2026',
      by: 'An',
      username: 'an.nguyen',
    });
  });

  it('the search shows from 11 people', () => {
    expect(BAN_SEARCH_FROM).toBe(11);
  });
});
