import { describe, expect, it } from 'vitest';
import {
  initialToastState,
  toastReducer,
  toastDuration,
  type ToastState,
} from './toastQueue';

const sent = {
  message: 'Không gửi được tin nhắn',
  action: { label: 'Thử lại', onPress: () => {} },
};
const copied = { message: 'Đã sao chép' };

const run = (
  state: ToastState,
  ...events: Parameters<typeof toastReducer>[1][]
) => events.reduce(toastReducer, state);

describe('toast queue (S-MOD-04)', () => {
  it('holds 4 s, or 6 s with an action (C-14)', () => {
    expect(toastDuration(copied)).toBe(4000);
    expect(toastDuration(sent)).toBe(6000);
  });

  it('shows one toast and hides it when its time is up', () => {
    let s = run(initialToastState, { type: 'show', toast: copied, now: 0 });
    expect(s.current?.toast).toBe(copied);
    expect(s.current?.hideAt).toBe(4000);
    s = run(s, { type: 'tick', now: 4000 });
    expect(s.current).toBeNull();
  });

  it('a new toast replaces the old one at once', () => {
    const s = run(
      initialToastState,
      { type: 'show', toast: copied, now: 0 },
      { type: 'show', toast: sent, now: 1000 },
    );
    expect(s.current?.toast).toBe(sent);
    expect(s.current?.hideAt).toBe(7000);
  });

  it('the same message only resets the timer', () => {
    const s = run(
      initialToastState,
      { type: 'show', toast: copied, now: 0 },
      { type: 'show', toast: { message: 'Đã sao chép' }, now: 3000 },
    );
    expect(s.current?.toast).toBe(copied);
    expect(s.current?.hideAt).toBe(7000);
  });

  it('waits while a sheet or dialog is open, then shows', () => {
    let s = run(
      initialToastState,
      { type: 'overlay', open: true },
      { type: 'show', toast: copied, now: 0 },
    );
    expect(s.current).toBeNull();
    s = run(s, { type: 'overlay', open: false, now: 2000 });
    expect(s.current?.toast).toBe(copied);
    expect(s.current?.hideAt).toBe(6000);
  });

  it('drops a waiting toast when the overlay stayed open more than 4 s', () => {
    const s = run(
      initialToastState,
      { type: 'overlay', open: true },
      { type: 'show', toast: copied, now: 0 },
      { type: 'overlay', open: false, now: 4001 },
    );
    expect(s.current).toBeNull();
    expect(s.pending).toBeNull();
  });

  it('counts nested overlays (sheet over dialog)', () => {
    const s = run(
      initialToastState,
      { type: 'overlay', open: true },
      { type: 'overlay', open: true },
      { type: 'show', toast: copied, now: 0 },
      { type: 'overlay', open: false, now: 100 },
    );
    expect(s.current).toBeNull();
  });

  it('dismiss hides the toast now', () => {
    const s = run(
      initialToastState,
      { type: 'show', toast: copied, now: 0 },
      { type: 'dismiss' },
    );
    expect(s.current).toBeNull();
  });
});
