import { describe, expect, it, vi } from 'vitest';
import { ringPhaseAlert, type PhaseAlertDevice } from './phaseAlert';

const device = (silenced: boolean) => ({
  silenced: () => silenced,
  play: vi.fn<PhaseAlertDevice['play']>(),
  vibrate: vi.fn<PhaseAlertDevice['vibrate']>(),
});

describe('ringPhaseAlert (SRS 3.3, CR-24 "Nghe thử")', () => {
  it('ringer on → plays as a notification', () => {
    const d = device(false);
    expect(ringPhaseAlert(d, false)).toBe('played');
    expect(d.play).toHaveBeenCalledWith(false);
  });

  it('silent / Không làm phiền and the switch off → no sound (`test-sound-silent`)', () => {
    const d = device(true);
    expect(ringPhaseAlert(d, false)).toBe('silenced');
    expect(d.play).not.toHaveBeenCalled();
    // Vibrate mode still buzzes (the native side skips it on full silent).
    expect(d.vibrate).toHaveBeenCalled();
  });

  it('silent but "Luôn phát âm báo chuyển pha" on → plays through the silence', () => {
    const d = device(true);
    expect(ringPhaseAlert(d, true)).toBe('played');
    expect(d.play).toHaveBeenCalledWith(true);
  });
});
