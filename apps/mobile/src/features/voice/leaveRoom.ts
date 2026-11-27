import { myFocusedSeconds } from '@nezfocus/shared';
import { voiceSession } from '../../data/voice';
import {
  dropSummary,
  roomSessionsStore,
} from '../../domain/study/roomSessions';
import { leftToast } from '../../domain/study/roomView';
import type { VoiceTarget } from '../../domain/voice/voiceSession';
import { closeVoice, openVoice } from '../../domain/voice/voiceView';
import { i18n } from '../../shared/i18n';
import { showToast } from '../../shared/ui/Toast';

const TOAST_NAME_MAX = 24; // S-ROOM-05 › Rời phòng: the room name in a Toast

// By code point, so an emoji is never cut in half.
export const shortName = (name: string) => {
  const chars = Array.from(name);
  return chars.length > TOAST_NAME_MAX
    ? `${chars.slice(0, TOAST_NAME_MAX).join('')}…`
    : name;
};

// S-ROOM-05 › Rời phòng: back to the channel before, with my minutes if I took part
// ("Đã rời {phòng} · {31} phút đã được tính · Vào lại"); "Vào lại" = the same room, mic off.
export function leaveRoom(target: VoiceTarget, name: string) {
  const { byChannel, ended, offsetMs } = roomSessionsStore.getState();
  const f = byChannel[target.channelId];
  const seconds = f?.me
    ? myFocusedSeconds(f, offsetMs, Date.now())
    : (ended[target.channelId]?.focused_seconds ?? null);
  const left = leftToast(seconds);
  const short = shortName(name);
  void voiceSession.leave();
  closeVoice();
  dropSummary(target.channelId);
  showToast({
    message:
      left.key === 'leftMinutes'
        ? i18n.t('room.leftMinutes', { name: short, minutes: left.minutes })
        : left.key === 'leftNone'
          ? i18n.t('room.leftNone', { name: short })
          : i18n.t('voice.left', { name: short }),
    action: {
      label: i18n.t('voice.rejoin'),
      onPress: () => {
        openVoice(target);
        void voiceSession.join(target);
      },
    },
  });
}
