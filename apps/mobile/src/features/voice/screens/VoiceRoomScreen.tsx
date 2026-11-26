import { LogOut, Mic, MicOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { voiceSession } from '../../../data/voice';
import { micPermission } from '../../../data/voice/micPermission';
import type { VoiceTarget } from '../../../domain/voice/voiceSession';
import { closeVoice, openVoice } from '../../../domain/voice/voiceView';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { ChannelHeader } from '../../../shared/ui/Chat';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { RoomControl, type RoomControlState } from '../../../shared/ui/Focus';
import {
  ParticipantTile,
  VideoGrid,
  gridTileWidth,
} from '../../../shared/ui/Room';
import { Text } from '../../../shared/ui/Text';
import { showToast, useToastTop } from '../../../shared/ui/Toast';
import { channelIcon } from '../../servers/components/ChannelRow';
import { MicSheet } from '../components/MicSheet';
import { useMicFlow } from '../hooks/useMicFlow';
import { useVoiceRoom } from '../hooks/useVoiceRoom';

const BODY_X = space[3];
const TOAST_NAME_MAX = 24; // S-ROOM-05 › Rời phòng: the room name in a Toast

const shortName = (name: string) =>
  name.length > TOAST_NAME_MAX ? `${name.slice(0, TOAST_NAME_MAX)}…` : name;

// S-ROOM-01: the preview (`not-joined`, `offline`, `no-connect`) and the room before a session
// (`study-room-idle`, `not-study-room`, `managers-only`, `voice-video-grid`).
export function VoiceRoomScreen({
  serverId,
  channelId,
  onOpenLeft,
}: VoiceTarget & { onOpenLeft: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const room = useVoiceRoom(serverId, channelId);
  const mic = useMicFlow();
  // Preview Mic (CR-22 #4): joins with the mic as chosen here.
  const [previewMic, setPreviewMic] = useState(false);
  const [joining, setJoining] = useState(false);
  useToastTop(top + size.header);

  const { channel, layout, here, joined } = room;
  if (!channel || !layout) return null;
  const target = { serverId, channelId };

  const join = async () => {
    setJoining(true);
    const result = await voiceSession.join(target, { mic: previewMic });
    setJoining(false);
    if (result === 'joined') setPreviewMic(false);
    else if (result === 'no-connect')
      showToast({ message: t('voice.noConnect') });
    else if (result === 'gone') {
      closeVoice();
      showToast({ message: t('voice.gone', { name: channel.name }) });
    } else if (result === 'failed')
      showToast({
        message: t('voice.joinFailed'),
        action: { label: t('voice.retry'), onPress: () => void join() },
      });
  };

  // S-ROOM-05 › Rời phòng: no question, back to the channel before, "Đã rời {phòng} · Vào lại".
  const leave = () => {
    void voiceSession.leave();
    closeVoice();
    showToast({
      message: t('voice.left', { name: shortName(channel.name) }),
      action: {
        label: t('voice.rejoin'),
        onPress: () => {
          openVoice(target);
          void voiceSession.join(target);
        },
      },
    });
  };

  const micOn = joined ? !!here?.mic : previewMic;
  const pressMic = async () => {
    if (micOn) {
      if (joined) void voiceSession.setMic(false);
      else setPreviewMic(false);
      return;
    }
    if (!(await mic.ensure())) return;
    if (joined) void voiceSession.setMic(true);
    else setPreviewMic(true);
  };
  const micState: RoomControlState = room.micDenied
    ? 'no-permission'
    : micOn
      ? 'on'
      : 'off';
  const micButton = layout.mic && (
    <RoomControl
      icon={micOn ? Mic : MicOff}
      label={t('voice.mic')}
      state={micState}
      onPress={() => void pressMic()}
    />
  );

  const tileWidth = gridTileWidth(width - BODY_X * 2, room.tiles.length);
  const banner = !joined ? (
    layout.access === 'offline' && <SystemBanner kind="offline" />
  ) : !room.online || here?.link === 'reconnecting' ? (
    <SystemBanner kind="reconnecting" />
  ) : (
    room.micDenied && (
      <SystemBanner
        kind="mic-denied"
        onOpenSettings={() => void micPermission.openSettings()}
      />
    )
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ChannelHeader
        icon={channelIcon(channel)}
        title={channel.name}
        onMenu={onOpenLeft}
      />
      {banner}
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.grid}>
          <VideoGrid>
            {room.tiles.map((tile) => (
              <ParticipantTile
                key={tile.userId}
                name={tile.name}
                avatar={tile.avatar}
                self={tile.self}
                mic={tile.mic}
                speaking={tile.speaking}
                away={tile.away}
                width={tileWidth}
              />
            ))}
          </VideoGrid>
        </ScrollView>
        {layout.start !== 'none' && layout.access === 'ok' && (
          <View style={[styles.startBar, { borderColor: colors.border }]}>
            <Text style={styles.flex}>
              {layout.start === 'hint'
                ? t('voice.noSessionJoin')
                : layout.start === 'managers-only'
                  ? t('voice.managersOnly')
                  : t('voice.noSession')}
            </Text>
            {layout.start === 'start' && (
              // ponytail: the Start sheet (S-ROOM-03) opens with P3-B3.4 (#148).
              <Button
                label={t('voice.startSession')}
                size="S"
                onPress={() => {}}
              />
            )}
          </View>
        )}
        {joined ? (
          <View style={styles.controls}>
            {micButton}
            <RoomControl
              icon={LogOut}
              label={t('voice.leave')}
              onPress={leave}
            />
          </View>
        ) : layout.access === 'ok' ? (
          <View style={styles.preview}>
            {micButton}
            <View style={styles.cta}>
              <Button
                label={t(room.elsewhere ? 'voice.switchHere' : 'voice.join')}
                size="L"
                fullWidth
                loading={joining || here?.phase === 'joining'}
                onPress={() => void join()}
              />
            </View>
          </View>
        ) : (
          <View style={styles.locked}>
            <Button label={t('voice.join')} size="L" fullWidth disabled />
            <Text variant="label" color="text-secondary" style={styles.center}>
              {t(
                layout.access === 'offline'
                  ? 'voice.offline'
                  : 'voice.noConnect',
              )}
            </Text>
          </View>
        )}
      </View>
      <MicSheet
        sheet={mic.sheet}
        onContinue={() => void mic.onContinue()}
        onSettings={mic.onSettings}
        onLater={mic.onLater}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingTop: space[2],
    paddingHorizontal: BODY_X,
    paddingBottom: space[3],
    gap: space[3],
  },
  grid: { paddingBottom: space[2] },
  startBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    borderWidth: 1,
    borderRadius: radius.button,
    paddingVertical: space[2] + space[1],
    paddingHorizontal: space[3],
  },
  flex: { flex: 1 },
  // Board: Mic · Camera · Rời phòng spread with half a gap at the ends.
  controls: { flexDirection: 'row', justifyContent: 'space-around' },
  // CR-22 #4: Mic · Camera, then "Vào phòng" takes the rest, its top on the discs' top + 4.
  preview: { flexDirection: 'row', gap: space[3] },
  cta: { flex: 1, paddingTop: space[1] },
  locked: { gap: space[2] },
  center: { textAlign: 'center' },
});
