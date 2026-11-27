import { roomTimer } from '@nezfocus/shared';
import {
  LogOut,
  Mic,
  MicOff,
  Pause,
  Video,
  Volume2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { voiceSession } from '../../../data/voice';
import { micPermission } from '../../../data/voice/micPermission';
import { homeStore } from '../../../domain/servers/homeStore';
import { sessionStore } from '../../../domain/session/sessionStore';
import { roomSessionsStore } from '../../../domain/study/roomSessions';
import { timerOf } from '../../../domain/study/solo';
import { seatsIn } from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { askLeaveRoom, openVoice } from '../../../domain/voice/voiceView';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { IconButton } from '../../../shared/ui/Button';
import {
  MiniPlayer,
  PhaseBadge,
  phaseColor,
  phaseIcon,
} from '../../../shared/ui/Focus';
import { Icon } from '../../../shared/ui/Icon';
import { clockText } from '../../../shared/ui/logic';
import { Text } from '../../../shared/ui/Text';
import { useToastAnchor } from '../../../shared/ui/Toast';
import { useNow, useSolo } from '../../study/hooks/useSolo';
import { leaveRoom } from '../leaveRoom';

// S-ROOM-08 / C-08 while I sit in a room: `room-session` (`paused`), `voice`, `voice-solo`,
// `camera-on`, `reconnecting`. Hidden on the room's own screen (`hidden`).
export function RoomMiniPlayer({
  hidden,
  onOpenSolo,
}: {
  hidden: boolean;
  onOpenSolo: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const call = useStore(voiceStore, (s) =>
    s.call?.phase === 'in' ? s.call : null,
  );
  const people = useStore(voiceStore, (s) =>
    call ? seatsIn(s.seats, call.channelId).length : 0,
  );
  const name = useStore(homeStore, (s) =>
    call
      ? s.channels[call.serverId]?.find((c) => c.id === call.channelId)?.name
      : undefined,
  );
  const session = useStore(roomSessionsStore, (s) =>
    call ? (s.byChannel[call.channelId] ?? null) : null,
  );
  const offsetMs = useStore(roomSessionsStore, (s) => s.offsetMs);
  const meId = useStore(sessionStore, (s) => s.user?.id ?? null);
  const solo = useSolo();
  const now = useNow();
  const shown = !!call && !hidden;
  useToastAnchor(shown ? size.miniPlayer : 0);
  if (!call || hidden) return null;

  const target = { serverId: call.serverId, channelId: call.channelId };
  const soloTimer = !session && solo ? timerOf(solo, now) : null;
  const roomClock = session && roomTimer(session, offsetMs, now.getTime());
  const paused = roomClock?.status === 'paused';

  const pressMic = async () => {
    if (call.mic) return void voiceSession.setMic(false);
    // The permission sheet lives on the room screen (S-MOD-05).
    if ((await micPermission.check()).granted) void voiceSession.setMic(true);
    else openVoice(target);
  };
  // The Host of a running session confirms on the room screen (S-ROOM-05 `host-leave`).
  const leave = () =>
    session && session.host_id === meId
      ? askLeaveRoom(target)
      : leaveRoom(target, name ?? '');

  const icon = roomClock ? (
    <Icon
      as={paused ? Pause : phaseIcon[roomClock.phase]}
      size="xl"
      color={paused ? 'text-secondary' : phaseColor[roomClock.phase]}
    />
  ) : soloTimer ? (
    <Icon
      as={phaseIcon[soloTimer.phase]}
      size="xl"
      color={phaseColor[soloTimer.phase]}
    />
  ) : (
    <Icon as={Volume2} size="xl" color="text-secondary" />
  );

  const line =
    call.link === 'reconnecting' ? (
      <Text variant="label" color="text-secondary" numberOfLines={1}>
        {t('room.mini.reconnecting')}
      </Text>
    ) : roomClock ? (
      <PhaseBadge
        phase={roomClock.phase}
        state={paused ? 'paused' : 'running'}
        size="S"
        label={t(
          paused ? 'study.phase.pausedShort' : `study.phase.${roomClock.phase}`,
        )}
        time={clockText(roomClock.remainingMs)}
      />
    ) : soloTimer ? (
      <View style={styles.row}>
        <PhaseBadge
          phase={soloTimer.phase}
          state={soloTimer.status}
          size="S"
          label={t(
            soloTimer.status === 'paused'
              ? 'study.phase.pausedShort'
              : soloTimer.status === 'waiting'
                ? 'study.phase.waiting'
                : `study.phase.${soloTimer.phase}`,
          )}
          time={clockText(soloTimer.remainingMs)}
        />
        <Text variant="label" color="text-secondary" numberOfLines={1}>
          {t('room.mini.solo')}
        </Text>
      </View>
    ) : (
      <Text variant="label" color="text-secondary" numberOfLines={1}>
        {t('room.mini.voice', { n: people })}
      </Text>
    );

  return (
    <MiniPlayer
      icon={icon}
      title={name ?? ''}
      line={line}
      // `voice-solo` opens the Solo screen, not the room (C-08).
      onOpen={soloTimer ? onOpenSolo : () => openVoice(target)}
      actions={
        <>
          {call.camera && (
            // C-08 `camera-on`: on, like RoomControl `on`; a tap turns it off at once, no Toast.
            <View style={[styles.on, { backgroundColor: colors['surface-3'] }]}>
              <IconButton
                icon={Video}
                label={t('room.mini.cameraOff')}
                color="text-primary"
                onPress={() => void voiceSession.setCamera(false)}
              />
            </View>
          )}
          <IconButton
            icon={call.mic ? Mic : MicOff}
            label={t('voice.mic')}
            disabled={call.modMuted}
            onPress={() => void pressMic()}
          />
          <IconButton icon={LogOut} label={t('voice.leave')} onPress={leave} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  on: { borderRadius: radius.full },
});
