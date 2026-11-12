// The phone side of the phase-change alert (data/phaseAlert).
export interface PhaseAlertDevice {
  // Ringer on silent / vibrate, or Không làm phiền.
  silenced(): boolean;
  // force: play through the silence ("Luôn phát âm báo chuyển pha").
  play(force: boolean): void;
}

// SRS 3.3: a phase change in the foreground, and S-ME-05 "Nghe thử", play one sound + vibration
// with the current settings; silenced phones stay quiet unless `always` (focus_sound_always).
export function playPhaseAlert(
  device: PhaseAlertDevice,
  always: boolean,
): 'played' | 'silenced' {
  const silenced = device.silenced();
  if (silenced && !always) return 'silenced';
  device.play(silenced);
  return 'played';
}
