import { describe, expect, it } from 'vitest';
import { MY_STATUSES, myDot } from './status';

describe('my status (S-ME-02 status-sheet, AUTH-05)', () => {
  it('the sheet lists Trực tuyến · Vắng mặt · Không làm phiền · Ẩn in that order', () => {
    expect(MY_STATUSES).toEqual(['online', 'idle', 'dnd', 'invisible']);
  });

  it('AC2: Ẩn shows me the offline dot, like everyone else sees me', () => {
    expect(myDot('invisible')).toBe('offline');
    expect(myDot('online')).toBe('online');
    expect(myDot('idle')).toBe('idle');
    expect(myDot('dnd')).toBe('dnd');
  });
});
