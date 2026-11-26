import { LogOut, Mic, MicOff, Video, VideoOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { voiceSession } from '../../../data/voice';
import { micPermission } from '../../../data/voice/micPermission';
import {
  CameraPreview,
  ParticipantVideo,
} from '../../../data/voice/VoiceVideo';
import type {
  JoinResult,
  VoiceTarget,
} from '../../../domain/voice/voiceSession';
import { voiceNotice } from '../../../domain/voice/voiceNotice';
import { closeVoice, openVoice } from '../../../domain/voice/voiceView';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { ChannelHeader } from '../../../shared/ui/Chat';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { RoomControl, type RoomControlState } from '../../../shared/ui/Focus';
import { Dialog } from '../../../shared/ui/Overlay';
import {
  ParticipantTile,
  VideoGrid,
  gridTileWidth,
} from '../../../shared/ui/Room';
import { Text } from '../../../shared/ui/Text';
import { showToast, useToastTop } from '../../../shared/ui/Toast';
import { channelIcon } from '../../servers/components/ChannelRow';
import { CameraPreviewSheet } from '../components/CameraPreviewSheet';
import { MediaSheet } from '../components/MediaSheet';
import { useMediaFlow } from '../hooks/useMediaFlow';
import { useVoiceRoom } from '../hooks/useVoiceRoom';

const BODY_X = space[3];
const TOAST_NAME_MAX = 24; // S-ROOM-05 › Rời phòng: the room name in a Toast

// By code point, so an emoji is never cut in half.
const shortName = (name: string) => {
  const chars = Array.from(name);
  return chars.length > TOAST_NAME_MAX
    ? `${chars.slice(0, TOAST_NAME_MAX).join('')}…`
    : name;
};

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
  const media = useMediaFlow();
  // Preview Mic / Camera (CR-22 #4): joins with them as chosen here.
  const [previewMic, setPreviewMic] = useState(false);
  const [previewCamera, setPreviewCamera] = useState(false);
  // `camera-self-preview`: the first Camera in a room this login, unless seen in the preview.
  const [selfPreview, setSelfPreview] = useState(false);
  const [joining, setJoining] = useState(false);
  useToastTop(top + size.header);
  const otherDevice = useStore(
    voiceNotice,
    (s) => s.otherDevice?.channelId === channelId,
  );

  const { channel, layout, here, joined } = room;
  if (!channel || !layout) return null;
  const target = { serverId, channelId };

  const tell = (result: JoinResult, retry: () => void) => {
    if (result === 'no-connect') showToast({ message: t('voice.noConnect') });
    else if (result === 'gone') {
      closeVoice();
      showToast({ message: t('voice.gone', { name: channel.name }) });
    } else if (result === 'failed')
      showToast({
        message: t('voice.joinFailed'),
        action: { label: t('voice.retry'), onPress: retry },
      });
  };
  const join = async () => {
    setJoining(true);
    const result = await voiceSession.join(target, {
      mic: previewMic,
      camera: previewCamera,
    });
    setJoining(false);
    if (result === 'joined') {
      setPreviewMic(false);
      setPreviewCamera(false);
    } else tell(result, () => void join());
  };
  // "Vào lại" (left-voice-toast) and "Vào lại ở đây" (other-device): the same room, mic off.
  const rejoin = async () => {
    openVoice(target);
    tell(await voiceSession.join(target), () => void rejoin());
  };

  // S-ROOM-05 › Rời phòng: no question, back to the channel before, "Đã rời {phòng} · Vào lại".
  const leave = () => {
    void voiceSession.leave();
    closeVoice();
    showToast({
      message: t('voice.left', { name: shortName(channel.name) }),
      action: {
        label: t('voice.rejoin'),
        onPress: () => void rejoin(),
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
    if (!(await media.ensure('mic'))) return;
    if (joined) void voiceSession.setMic(true);
    else setPreviewMic(true);
  };

  const cameraOn = joined ? !!here?.camera : previewCamera;
  const pressCamera = async () => {
    if (cameraOn) {
      if (joined) void voiceSession.setCamera(false);
      else setPreviewCamera(false);
      return;
    }
    if (!(await media.ensure('camera'))) return;
    if (!joined) setPreviewCamera(true);
    // VC-01 AC7: seen once this login → straight on; else `camera-self-preview` first.
    else if (room.cameraPreviewed) void voiceSession.setCamera(true);
    else setSelfPreview(true);
  };

  const state = (denied: boolean, on: boolean): RoomControlState =>
    denied ? 'no-permission' : on ? 'on' : 'off';
  const toggles = (
    <>
      {layout.mic && (
        <RoomControl
          icon={micOn ? Mic : MicOff}
          // C-17 `mod-muted` (REQ-VC-04): disabled until a moderator turns it back on.
          label={t(here?.modMuted ? 'voice.modMuted' : 'voice.mic')}
          state={here?.modMuted ? 'mod-muted' : state(room.denied.mic, micOn)}
          narrow={!joined}
          onPress={() => void pressMic()}
        />
      )}
      {layout.camera && (
        <RoomControl
          icon={cameraOn ? Video : VideoOff}
          label={t('voice.camera')}
          state={state(room.denied.camera, cameraOn)}
          narrow={!joined}
          onPress={() => void pressCamera()}
        />
      )}
    </>
  );

  const tileWidth = gridTileWidth(width - BODY_X * 2, room.tiles.length);
  const banner = !joined ? (
    layout.access === 'offline' && <SystemBanner kind="offline" />
  ) : !room.online || here?.link === 'reconnecting' ? (
    <SystemBanner kind="reconnecting" />
  ) : (
    room.denied.mic && (
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
                poorNetwork={tile.poorNetwork}
                width={tileWidth}
                video={
                  tile.camera ? (
                    <ParticipantVideo userId={tile.userId} mirror={tile.self} />
                  ) : undefined
                }
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
            {toggles}
            <RoomControl
              icon={LogOut}
              label={t('voice.leave')}
              onPress={leave}
            />
          </View>
        ) : layout.access === 'ok' ? (
          <View style={styles.preview}>
            {previewCamera && (
              // CR-22 #4: floats over the grid, 16 from the edge and the buttons, never pushes.
              <View style={styles.selfTile}>
                <ParticipantTile
                  name=""
                  self
                  mic={null}
                  width={size.videoTileSelf}
                  video={<CameraPreview />}
                />
              </View>
            )}
            {(layout.mic || layout.camera) && (
              <View style={styles.toggles}>{toggles}</View>
            )}
            <View style={styles.cta}>
              <Button
                label={t(room.elsewhere ? 'voice.switchHere' : 'voice.join')}
                size="L"
                fullWidth
                oneLine
                // Board C-17 preview row: the button's sides are 12, not 16.
                style={styles.ctaButton}
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
      <MediaSheet
        sheet={media.sheet}
        onContinue={() => void media.onContinue()}
        onSettings={media.onSettings}
        onLater={media.onLater}
      />
      <Dialog
        visible={otherDevice}
        title={t('voice.otherDevice.title')}
        // S-ROOM-EDGE `other-device`: back in with the mic off; the other phone is put out.
        confirm={{
          label: t('voice.otherDevice.rejoin'),
          onPress: () => {
            voiceNotice.setState({ otherDevice: null });
            void rejoin();
          },
        }}
        cancel={{
          label: t('voice.otherDevice.close'),
          onPress: () => voiceNotice.setState({ otherDevice: null }),
        }}
        onDismiss={() => voiceNotice.setState({ otherDevice: null })}
      />
      <CameraPreviewSheet
        visible={selfPreview}
        onTurnOn={() => {
          setSelfPreview(false);
          void voiceSession.setCamera(true);
        }}
        onDismiss={() => setSelfPreview(false)}
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
  toggles: { flexDirection: 'row', gap: space[2] },
  selfTile: {
    position: 'absolute',
    right: 0,
    bottom: '100%',
    marginBottom: space[3],
  },
  cta: { flex: 1, paddingTop: space[1] },
  ctaButton: { paddingHorizontal: space[2] + space[1] },
  locked: { gap: space[2] },
  center: { textAlign: 'center' },
});
