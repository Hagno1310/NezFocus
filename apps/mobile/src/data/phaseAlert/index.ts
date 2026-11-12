import { Vibration } from 'react-native';
import PhaseAlert from '../../../modules/phase-alert';
import {
  playPhaseAlert as decide,
  type PhaseAlertDevice,
} from '../../domain/settings/phaseAlert';
import { settingsStore } from '../../domain/settings/settingsStore';

// A dev client built before modules/phase-alert existed: vibrate only, never "silenced".
const fallback: PhaseAlertDevice = {
  silenced: () => false,
  play: () => Vibration.vibrate([0, 250, 150, 250]),
};

const native = PhaseAlert;
const device: PhaseAlertDevice = native
  ? { silenced: () => native.isSilenced(), play: (f) => native.play(f) }
  : fallback;

// SRS 3.3: the one function for a phase change in the foreground (Solo, Room Session P3-B3.4
// #148) and S-ME-05 "Nghe thử". Reads "Luôn phát âm báo chuyển pha" from the settings.
export const playPhaseAlert = () =>
  decide(
    device,
    settingsStore.getState().settings?.focus_sound_always ?? false,
  );
