import { describe, expect, it, vi } from 'vitest';
import { interacted, onInteraction } from './interaction';

describe('interaction (AUTH-05 AC1)', () => {
  it('tells every listener, and stops after unsubscribe', () => {
    const seen = vi.fn();
    const stop = onInteraction(seen);
    interacted();
    stop();
    interacted();
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
