import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gatewayStore, watchConnectionBanner } from './gatewayStore';

const set = gatewayStore.setState;
const banner = () => gatewayStore.getState().banner;

let stop: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  set({ status: 'idle', online: true, foreground: true, banner: null });
  stop = watchConnectionBanner();
});
afterEach(() => {
  stop();
  vi.useRealTimers();
});

// S-MOD-04: offline / reconnecting only after 3 s in a row, never both, gone on reconnect.
describe('connection banner', () => {
  it('shows reconnecting after 3 s without the Gateway', () => {
    set({ status: 'connecting' });
    vi.advanceTimersByTime(2999);
    expect(banner()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(banner()).toBe('reconnecting');
  });

  it('never shows for a drop shorter than 3 s', () => {
    set({ status: 'connecting' });
    vi.advanceTimersByTime(2000);
    set({ status: 'connected' });
    vi.advanceTimersByTime(5000);
    expect(banner()).toBeNull();
  });

  it('shows offline instead when the phone has no network', () => {
    set({ status: 'connecting', online: false });
    vi.advanceTimersByTime(3000);
    expect(banner()).toBe('offline');
    set({ online: true }); // network back, Gateway still reconnecting
    expect(banner()).toBe('reconnecting');
  });

  it('disappears as soon as the Gateway is back', () => {
    set({ status: 'connecting' });
    vi.advanceTimersByTime(3000);
    set({ status: 'connected' });
    expect(banner()).toBeNull();
  });

  it('shows nothing when signed out, paused or in the background', () => {
    for (const state of [
      { status: 'idle' as const, online: false },
      { status: 'paused' as const, online: false },
      { status: 'connecting' as const, foreground: false },
    ]) {
      set({ online: true, foreground: true, ...state });
      vi.advanceTimersByTime(5000);
      expect(banner()).toBeNull();
    }
  });
});
