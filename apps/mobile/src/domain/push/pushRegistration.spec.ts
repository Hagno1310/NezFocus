import { describe, expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { startPushRegistration, type PushDevice } from './pushRegistration';

type Status = 'signed-out' | 'incomplete' | 'signed-in';

function setup(status: Status, opts: { failFirst?: boolean } = {}) {
  const session = createStore<{ status: Status }>(() => ({ status }));
  let token = 'tok-1';
  let tokenListener: ((t: string) => void) | null = null;
  let foreground: (() => void) | null = null;
  const forgotten: number[] = [];
  const registered: string[] = [];
  let fail = opts.failFirst ?? false;
  const device: PushDevice = {
    token: async () => token,
    onTokenChange: (cb) => {
      tokenListener = cb;
      return () => (tokenListener = null);
    },
    forget: async () => {
      forgotten.push(1);
      await new Promise((r) => setTimeout(r, 5));
      token = `tok-new-${forgotten.length}`; // FCM makes a new one on the next ask
    },
  };
  const stop = startPushRegistration({
    device,
    repo: {
      register: async (t) => {
        if (fail) {
          fail = false;
          throw new Error('offline');
        }
        registered.push(t);
      },
    },
    session,
    onForeground: (cb) => {
      foreground = cb;
      return () => (foreground = null);
    },
  });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  return {
    session,
    registered,
    forgotten,
    stop,
    flush,
    refresh: (t: string) => {
      token = t;
      tokenListener?.(t);
    },
    foreground: () => foreground?.(),
  };
}

describe('push token registration (#154: "đăng ký sau đăng nhập và khi FCM đổi token")', () => {
  it('registers at launch when already signed in', async () => {
    const t = setup('signed-in');
    await t.flush();
    expect(t.registered).toEqual(['tok-1']);
  });

  it('registers once the user is signed in, not before (an incomplete account gets 40309)', async () => {
    const t = setup('signed-out');
    await t.flush();
    t.session.setState({ status: 'incomplete' });
    await t.flush();
    expect(t.registered).toEqual([]);
    t.session.setState({ status: 'signed-in' });
    await t.flush();
    expect(t.registered).toEqual(['tok-1']);
  });

  it('registers again when FCM changes the token', async () => {
    const t = setup('signed-in');
    await t.flush();
    t.refresh('tok-2');
    await t.flush();
    expect(t.registered).toEqual(['tok-1', 'tok-2']);
  });

  it('tries again on coming back to the foreground after a failure, only then', async () => {
    const t = setup('signed-in', { failFirst: true });
    await t.flush();
    expect(t.registered).toEqual([]);
    t.foreground();
    await t.flush();
    expect(t.registered).toEqual(['tok-1']);
    t.foreground();
    await t.flush();
    expect(t.registered).toEqual(['tok-1']);
  });

  it('a sign-in right after a sign-out sends the new token, not the dropped one', async () => {
    const t = setup('signed-in');
    await t.flush();
    t.session.setState({ status: 'signed-out' });
    t.session.setState({ status: 'signed-in' });
    await new Promise((r) => setTimeout(r, 20));
    expect(t.registered).toEqual(['tok-1', 'tok-new-1']);
  });

  it('signing out drops the token on the phone, so even an offline sign-out stops push', async () => {
    const t = setup('signed-in');
    await t.flush();
    t.session.setState({ status: 'signed-out' });
    await t.flush();
    expect(t.forgotten).toHaveLength(1);
    t.refresh('tok-3'); // a token arriving while signed out is not sent
    await t.flush();
    expect(t.registered).toEqual(['tok-1']);
  });
});
