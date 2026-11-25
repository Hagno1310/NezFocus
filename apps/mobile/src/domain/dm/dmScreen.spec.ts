import { describe, expect, it } from 'vitest';
import { dmScreen } from './dmScreen';

const studying = { kind: 'solo' } as never;
const base = {
  deleted: false,
  relationship: 'friend' as const,
  canMessage: true,
  status: 'online' as const,
  activity: null,
};

// S-DM-02 › Trạng thái (spec 09, chốt 25/11/2026).
describe('S-DM-02 state', () => {
  it('default: composer, presence dot, full activity or the status as sub-line', () => {
    expect(dmScreen({ ...base, activity: studying })).toEqual({
      bottom: 'composer',
      strip: null,
      dot: true,
      sub: { kind: 'activity', activity: studying },
    });
    expect(dmScreen({ ...base, status: 'dnd' }).sub).toEqual({
      kind: 'status',
      status: 'dnd',
    });
  });

  it('offline (new-dm): no sub-line, the dot stays', () => {
    const s = dmScreen({ ...base, status: 'offline' });
    expect([s.sub, s.dot]).toEqual([null, true]);
  });

  it('not-friend / request received / request sent → the strip under the header (DM-02)', () => {
    expect(dmScreen({ ...base, relationship: 'none' }).strip).toBe(
      'not-friend',
    );
    expect(dmScreen({ ...base, relationship: 'incoming' }).strip).toBe(
      'request-received',
    );
    expect(dmScreen({ ...base, relationship: 'outgoing' }).strip).toBe(
      'request-sent',
    );
  });

  it('cannot-message (40303): composer locked, no dot, no sub-line, no strip', () => {
    expect(
      dmScreen({
        ...base,
        relationship: 'none',
        canMessage: false,
        activity: studying,
      }),
    ).toEqual({ bottom: 'cannot', strip: null, dot: false, sub: null });
  });

  it('blocked-by-me: unblock strip in place of the composer, no dot, no sub-line', () => {
    expect(
      dmScreen({ ...base, relationship: 'blocked', canMessage: false }),
    ).toEqual({ bottom: 'blocked-by-me', strip: null, dot: false, sub: null });
  });

  it('deleted-account wins over everything', () => {
    expect(
      dmScreen({ ...base, deleted: true, relationship: 'blocked' }),
    ).toEqual({ bottom: 'deleted', strip: null, dot: false, sub: null });
  });
});
