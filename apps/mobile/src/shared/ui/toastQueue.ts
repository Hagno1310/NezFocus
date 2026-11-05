import type { IconComponent } from './Icon';

export type Toast = {
  message: string;
  icon?: IconComponent;
  action?: { label: string; onPress: () => void };
};

// S-MOD-04: one at a time; a toast that waited behind an overlay for more than this is dropped.
const MAX_WAIT_MS = 4000;

export const toastDuration = (t: Toast) => (t.action ? 6000 : 4000);

export type ToastState = {
  current: { toast: Toast; hideAt: number } | null;
  pending: { toast: Toast; since: number } | null;
  overlays: number;
};

export type ToastEvent =
  | { type: 'show'; toast: Toast; now: number }
  | { type: 'tick'; now: number }
  | { type: 'dismiss' }
  | { type: 'overlay'; open: true }
  | { type: 'overlay'; open: false; now: number };

export const initialToastState: ToastState = {
  current: null,
  pending: null,
  overlays: 0,
};

const shown = (toast: Toast, now: number) => ({
  toast,
  hideAt: now + toastDuration(toast),
});

export function toastReducer(s: ToastState, e: ToastEvent): ToastState {
  switch (e.type) {
    case 'show':
      if (s.overlays > 0)
        return { ...s, pending: { toast: e.toast, since: e.now } };
      // Same message only resets the timer.
      if (s.current?.toast.message === e.toast.message)
        return { ...s, current: shown(s.current.toast, e.now) };
      return { ...s, current: shown(e.toast, e.now) };
    case 'tick':
      return s.current && e.now >= s.current.hideAt
        ? { ...s, current: null }
        : s;
    case 'dismiss':
      return { ...s, current: null };
    case 'overlay': {
      if (e.open) return { ...s, overlays: s.overlays + 1, current: null };
      const overlays = Math.max(0, s.overlays - 1);
      if (overlays > 0 || !s.pending) return { ...s, overlays };
      const fresh = e.now - s.pending.since <= MAX_WAIT_MS;
      return {
        overlays,
        pending: null,
        current: fresh ? shown(s.pending.toast, e.now) : null,
      };
    }
  }
}
