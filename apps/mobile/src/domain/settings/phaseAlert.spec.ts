import { describe, expect, it, vi } from 'vitest';
import { playPhaseAlert, type PhaseAlertDevice } from './phaseAlert';

const device = (silenced: boolean) => ({
  silenced: () => silenced,
  play: vi.fn<PhaseAlertDevice['play']>(),
});

describe('playPhaseAlert (SRS 3.3, CR-24 "Nghe thử")', () => {
  it('ringer on → plays as a notification', () => {
    const d = device(false);
    expect(playPhaseAlert(d, false)).toBe('played');
    expect(d.play).toHaveBeenCalledWith(false);
  });

  it('silent / Không làm phiền and the switch off → no sound (`test-sound-silent`)', () => {
    const d = device(true);
    expect(playPhaseAlert(d, false)).toBe('silenced');
    expect(d.play).not.toHaveBeenCalled();
  });

  it('silent but "Luôn phát âm báo chuyển pha" on → plays through the silence', () => {
    const d = device(true);
    expect(playPhaseAlert(d, true)).toBe('played');
    expect(d.play).toHaveBeenCalledWith(true);
  });
});
