// The phone side of the phase-change alert (data/phaseAlert).
export interface PhaseAlertDevice {
  // Ringer on silent / vibrate, or Không làm phiền.
  silenced(): boolean;
  // Sound + vibration; force: play through the silence ("Luôn phát âm báo chuyển pha").
  play(force: boolean): void;
  // Vibration only, as the phone's vibration setting allows (none on silent).
  vibrate(): void;
}

// SRS 3.3: a phase change in the foreground, and S-ME-05 "Nghe thử", play one sound + vibration
// with the current settings. A silenced phone gets no sound unless `always`
// (focus_sound_always), but still the vibration it allows (on vibrate mode: a buzz).
export function ringPhaseAlert(
  device: PhaseAlertDevice,
  always: boolean,
): 'played' | 'silenced' {
  const silenced = device.silenced();
  if (silenced && !always) {
    device.vibrate();
    return 'silenced';
  }
  device.play(silenced);
  return 'played';
}
