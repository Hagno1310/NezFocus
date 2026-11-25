import { describe, expect, it } from 'vitest';
import { createAckBatcher, seenAtBottom } from './ackBatcher';

// A clock driven by hand: timers fire when `advance` passes them.
function fakeClock() {
  let now = 0;
  let timers: { at: number; fn: () => void }[] = [];
  return {
    setTimer: (fn: () => void, ms: number) => {
      const t = { at: now + ms, fn };
      timers.push(t);
      return () => void (timers = timers.filter((x) => x !== t));
    },
    advance(ms: number) {
      now += ms;
      const due = timers.filter((t) => t.at <= now);
      timers = timers.filter((t) => t.at > now);
      due.forEach((t) => t.fn());
    },
  };
}

describe('REQ-NOTIF-01 / SRS 7.3.3: one ack per second, for the newest message seen', () => {
  it('messages seen within 1 s give one ack, for the newest', () => {
    const clock = fakeClock();
    const sent: [string, string][] = [];
    const acks = createAckBatcher({
      send: (c, m) => sent.push([c, m]),
      setTimer: clock.setTimer,
    });
    acks.seen('a', '10', '5');
    clock.advance(400);
    acks.seen('a', '12', '5');
    acks.seen('a', '11', '5'); // older than what is waiting: ignored
    clock.advance(599);
    expect(sent).toEqual([]);
    clock.advance(1);
    expect(sent).toEqual([['a', '12']]);
  });

  it('nothing for a message already read', () => {
    const clock = fakeClock();
    const sent: [string, string][] = [];
    const acks = createAckBatcher({
      send: (c, m) => sent.push([c, m]),
      setTimer: clock.setTimer,
    });
    acks.seen('a', '5', '5');
    acks.seen('a', '4', '5');
    clock.advance(1000);
    expect(sent).toEqual([]);
  });

  it('cancel drops what waits (left the channel, app went to the background)', () => {
    const clock = fakeClock();
    const sent: [string, string][] = [];
    const acks = createAckBatcher({
      send: (c, m) => sent.push([c, m]),
      setTimer: clock.setTimer,
    });
    acks.seen('a', '9', null);
    acks.cancel();
    clock.advance(1000);
    expect(sent).toEqual([]);
  });
});

describe('REQ-NOTIF-01 / SRS 7.3.3: seenAtBottom', () => {
  const shown = { newestId: '10', canAck: true };
  const at = {
    newestId: '11',
    canAck: true,
    atBottom: true,
    loading: false,
    settled: true,
  };

  it('a message arriving at the bottom is seen', () => {
    expect(seenAtBottom(shown, at)).toBe('11');
  });

  it('coming back to the foreground at the bottom sees the newest (NOTIF-01 AC3)', () => {
    expect(seenAtBottom({ newestId: '11', canAck: false }, at)).toBe('11');
  });

  it('nothing new and nothing changed: no ack', () => {
    expect(seenAtBottom({ newestId: '11', canAck: true }, at)).toBeNull();
  });

  it('scrolled up, in the background or covered: no ack', () => {
    expect(seenAtBottom(shown, { ...at, atBottom: false })).toBeNull();
    expect(seenAtBottom(shown, { ...at, canAck: false })).toBeNull();
  });

  it('the first page loading in is left to the "Tin nhắn mới" line', () => {
    expect(seenAtBottom({ newestId: null, canAck: true }, at)).toBeNull();
    expect(seenAtBottom(shown, { ...at, loading: true })).toBeNull();
  });

  it('opened with unread: nothing until the list has gone to the line', () => {
    expect(seenAtBottom(shown, { ...at, settled: false })).toBeNull();
  });
});
