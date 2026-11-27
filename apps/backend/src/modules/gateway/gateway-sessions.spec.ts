import { afterEach, describe, expect, it, vi } from 'vitest';
import { GatewaySessions, type SessionSocket } from './gateway-sessions.js';

const socket = (): SessionSocket => ({ sendText: () => {}, close: () => {} });

function setup() {
  let id = 1n;
  return new GatewaySessions({ next: () => id++ });
}

describe('hasForegroundSession (DEC-34, REQ-NOTIF-04)', () => {
  afterEach(() => vi.useRealTimers());

  it('is true for a connected device whose app is in the foreground', () => {
    const sessions = setup();
    sessions.create(7n, 70n, socket());
    expect(sessions.hasForegroundSession(7n)).toBe(true);
    expect(sessions.hasForegroundSession(8n)).toBe(false);
  });

  it('ignores a device in the background, even with its socket alive', () => {
    const sessions = setup();
    const s = sessions.create(7n, 70n, socket());
    sessions.setAppState(s, 'background');
    expect(sessions.hasForegroundSession(7n)).toBe(false);
  });

  it('ignores a socket that went away', () => {
    const sessions = setup();
    const sock = socket();
    const s = sessions.create(7n, 70n, sock);
    sessions.detach(s, sock);
    expect(sessions.hasForegroundSession(7n)).toBe(false);
  });

  it('ignores a foreground device silent for 2 minutes', () => {
    vi.useFakeTimers({ now: new Date('2026-11-27T10:00:00Z') });
    const sessions = setup();
    const s = sessions.create(7n, 70n, socket());
    vi.setSystemTime(new Date('2026-11-27T10:01:59Z'));
    expect(sessions.hasForegroundSession(7n)).toBe(true);
    vi.setSystemTime(new Date('2026-11-27T10:02:01Z'));
    expect(sessions.hasForegroundSession(7n)).toBe(false);
    sessions.touch(s);
    expect(sessions.hasForegroundSession(7n)).toBe(true);
  });
});
